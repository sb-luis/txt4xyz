import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { SyncProvider, type ConnectionStatus } from "./provider";
import { generateIdentity } from "./identity";

export function relayUrl(): string {
  const configured = import.meta.env.VITE_RELAY_URL;
  if (configured) return configured;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export interface Participant {
  clientId: number;
  name: string;
  color: string;
}

export interface UseRoomResult {
  ytext: Y.Text | null;
  awareness: awarenessProtocol.Awareness | null;
  status: ConnectionStatus;
  participants: Participant[];
}

const EMPTY_PARTICIPANTS: Participant[] = [];

const DISCONNECTED_SNAPSHOT: UseRoomResult = {
  ytext: null,
  awareness: null,
  status: "disconnected",
  participants: EMPTY_PARTICIPANTS,
};

function readParticipants(awareness: awarenessProtocol.Awareness): Participant[] {
  const participants: Participant[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const user = (state as { user?: { name?: unknown; color?: unknown } } | null)?.user;
    if (typeof user?.name !== "string" || typeof user?.color !== "string") return;
    participants.push({ clientId, name: user.name, color: user.color });
  });
  participants.sort((a, b) => a.clientId - b.clientId);
  return participants;
}

function sameParticipants(a: Participant[], b: Participant[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.clientId === b[i].clientId && p.name === b[i].name && p.color === b[i].color);
}

export function useRoom(roomId: string | null, seed: string | null = null): UseRoomResult {
  const snapshotRef = useRef<UseRoomResult>(DISCONNECTED_SNAPSHOT);
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((onStoreChange: () => void) => {
    listenersRef.current.add(onStoreChange);
    return () => listenersRef.current.delete(onStoreChange);
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  useEffect(() => {
    if (roomId === null) {
      snapshotRef.current = DISCONNECTED_SNAPSHOT;
      notify();
      return;
    }

    const doc = new Y.Doc();
    const ytext = doc.getText("shared");
    // Only safe because the caller passes a seed exclusively for a room it just
    // created: an id nobody else can hold yet, so there is no remote text to
    // duplicate. Seeding on join would append a second copy of the document.
    if (seed !== null) ytext.insert(0, seed);

    // Lifetime matches the room exactly: created and torn down alongside the
    // doc, so no cursor from a previous room can leak into a new one.
    const awareness = new awarenessProtocol.Awareness(doc);
    const identity = generateIdentity();
    awareness.setLocalStateField("user", identity);

    let participants = readParticipants(awareness);

    const provider = new SyncProvider({ doc, awareness, url: relayUrl(), roomId });
    snapshotRef.current = { ytext, awareness, status: provider.status, participants };
    notify();

    const onAwarenessChange = () => {
      const next = readParticipants(awareness);
      if (sameParticipants(participants, next)) return;
      participants = next;
      snapshotRef.current = { ...snapshotRef.current, participants };
      notify();
    };
    awareness.on("change", onAwarenessChange);

    const unsubscribe = provider.onStatusChange((status) => {
      snapshotRef.current = { ...snapshotRef.current, status };
      notify();
    });

    return () => {
      awareness.off("change", onAwarenessChange);
      unsubscribe();
      provider.destroy();
      awareness.destroy();
      doc.destroy();
      snapshotRef.current = DISCONNECTED_SNAPSHOT;
      notify();
    };
  }, [roomId, seed, notify]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
