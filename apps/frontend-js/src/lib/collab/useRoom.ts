import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { SyncProvider, type ConnectionStatus } from "./provider";
import { generateIdentity } from "./identity";
import { createRoomDoc } from "./room";
import { createDebouncedRoomDocWriter, readStoredRoomDoc } from "@/lib/persistence/localStore";

// Budget for a peer to answer sync step 1 and announce itself: a full relay
// round trip plus a coalesce round. Sized for a transatlantic RTT rather than
// localhost, because concluding "alone" too early restores stale local text
// into a room that already has a live participant.
export const RESTORE_GRACE_MS = 1_200;

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
  rejectedCode: number | null;
  participants: Participant[];
}

const EMPTY_PARTICIPANTS: Participant[] = [];

const DISCONNECTED_SNAPSHOT: UseRoomResult = {
  ytext: null,
  awareness: null,
  status: "disconnected",
  rejectedCode: null,
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

export function useRoom(roomId: string | null): UseRoomResult {
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

    const doc = createRoomDoc();
    const ytext = doc.getText("shared");

    // Lifetime matches the room exactly: created and torn down alongside the
    // doc, so no cursor from a previous room can leak into a new one.
    const awareness = new awarenessProtocol.Awareness(doc);
    const identity = generateIdentity();
    awareness.setLocalStateField("user", identity);

    let participants = readParticipants(awareness);

    const provider = new SyncProvider({ doc, awareness, url: relayUrl(), roomId });
    snapshotRef.current = {
      ytext,
      awareness,
      status: provider.status,
      rejectedCode: provider.rejectedCode,
      participants,
    };
    notify();

    const writer = createDebouncedRoomDocWriter(roomId);
    const onDocChange = () => writer.schedule(ytext.toString());
    ytext.observe(onDocChange);

    let restoreScheduled = false;
    let restoreAttempted = false;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    // Restore only once we have proven we're alone: still empty, no other
    // participant, and the grace period has elapsed. Any of those failing
    // means a peer may hold the real document, and restoring would duplicate
    // it — the exact bug the old `seed` path in this hook already hit once.
    const attemptRestore = () => {
      restoreAttempted = true;
      if (ytext.length > 0) return;
      const others = readParticipants(awareness).filter((p) => p.clientId !== doc.clientID);
      if (others.length > 0) return;
      const stored = readStoredRoomDoc(roomId);
      if (stored !== null && stored.length > 0) {
        ytext.insert(0, stored);
      }
    };

    const scheduleRestoreCheck = () => {
      if (restoreScheduled || restoreAttempted) return;
      restoreScheduled = true;
      restoreTimer = setTimeout(() => {
        restoreTimer = null;
        attemptRestore();
      }, RESTORE_GRACE_MS);
    };

    const onAwarenessChange = () => {
      const next = readParticipants(awareness);
      if (sameParticipants(participants, next)) return;
      participants = next;
      snapshotRef.current = { ...snapshotRef.current, participants };
      notify();
    };
    awareness.on("change", onAwarenessChange);

    const unsubscribe = provider.onStatusChange((status) => {
      snapshotRef.current = { ...snapshotRef.current, status, rejectedCode: provider.rejectedCode };
      notify();
      if (status === "connected") scheduleRestoreCheck();
    });

    return () => {
      if (restoreTimer !== null) clearTimeout(restoreTimer);
      writer.cancel();
      ytext.unobserve(onDocChange);
      awareness.off("change", onAwarenessChange);
      unsubscribe();
      provider.destroy();
      awareness.destroy();
      doc.destroy();
      snapshotRef.current = DISCONNECTED_SNAPSHOT;
      notify();
    };
  }, [roomId, notify]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
