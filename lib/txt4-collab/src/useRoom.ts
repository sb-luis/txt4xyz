import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { SyncProvider, type ConnectionStatus } from "./provider";
import { generateIdentity } from "./identity";
import { createRoomDoc } from "./room";

// Sized for a transatlantic RTT, not localhost: concluding "alone" too early restores stale text into a room with a live peer.
export const RESTORE_GRACE_MS = 1_200;

// The port a host application implements to give useRoom a local backstop.
// Absent, the local-restore behaviour is simply skipped.
export interface DocStore {
  read(roomId: string): string | null;
  write(roomId: string, doc: string): void;
}

export function defaultRelayUrl(): string {
  const configured = import.meta.env.VITE_RELAY_URL;
  if (configured) return configured;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export interface Participant {
  clientId: number;
  name: string;
}

export interface RunBroadcast {
  id: string;
  requestedBy: number;
}

export interface UseRoomResult {
  ytext: Y.Text | null;
  awareness: awarenessProtocol.Awareness | null;
  status: ConnectionStatus;
  rejectedCode: number | null;
  participants: Participant[];
  lastRunBroadcast: RunBroadcast | null;
  broadcastRun: (runId: string) => void;
}

export interface UseRoomOptions {
  roomId: string | null;
  alias?: string | null;
  store?: DocStore;
  relayUrl?: () => string;
}

const EMPTY_PARTICIPANTS: Participant[] = [];

const NOOP_BROADCAST_RUN = () => {};

const DISCONNECTED_SNAPSHOT: UseRoomResult = {
  ytext: null,
  awareness: null,
  status: "disconnected",
  rejectedCode: null,
  participants: EMPTY_PARTICIPANTS,
  lastRunBroadcast: null,
  broadcastRun: NOOP_BROADCAST_RUN,
};

function readParticipants(awareness: awarenessProtocol.Awareness): Participant[] {
  const participants: Participant[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const user = (state as { user?: { name?: unknown } } | null)?.user;
    if (typeof user?.name !== "string") return;
    participants.push({ clientId, name: user.name });
  });
  participants.sort((a, b) => a.clientId - b.clientId);
  return participants;
}

function sameParticipants(a: Participant[], b: Participant[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.clientId === b[i].clientId && p.name === b[i].name);
}

const DEBOUNCE_MS = 500;

function createDebouncedWriter(
  store: DocStore,
  roomId: string,
  delayMs = DEBOUNCE_MS,
): { schedule: (doc: string) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(doc: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        store.write(roomId, doc);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}

export function useRoom(options: UseRoomOptions): UseRoomResult {
  const { roomId, alias = null } = options;

  const snapshotRef = useRef<UseRoomResult>(DISCONNECTED_SNAPSHOT);
  const listenersRef = useRef(new Set<() => void>());
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const placeholderNameRef = useRef<string | null>(null);
  const colorRef = useRef<string | null>(null);
  const providerRef = useRef<SyncProvider | null>(null);

  // Kept current via a layout effect (runs before the main effect below) so a freshly constructed store/relayUrl doesn't retrigger it.
  const storeRef = useRef<DocStore | undefined>(options.store);
  const resolveRelayUrlRef = useRef<() => string>(options.relayUrl ?? defaultRelayUrl);
  useLayoutEffect(() => {
    storeRef.current = options.store;
    resolveRelayUrlRef.current = options.relayUrl ?? defaultRelayUrl;
  });

  const subscribe = useCallback((onStoreChange: () => void) => {
    listenersRef.current.add(onStoreChange);
    return () => listenersRef.current.delete(onStoreChange);
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  const broadcastRun = useCallback((runId: string) => {
    providerRef.current?.broadcastRun(runId);
  }, []);

  useEffect(() => {
    if (roomId === null) {
      awarenessRef.current = null;
      providerRef.current = null;
      snapshotRef.current = DISCONNECTED_SNAPSHOT;
      notify();
      return;
    }

    const store = storeRef.current;
    const resolveRelayUrl = resolveRelayUrlRef.current;

    const doc = createRoomDoc();
    const ytext = doc.getText("shared");

    // Lifetime matches the room exactly: created and torn down alongside the
    // doc, so no cursor from a previous room can leak into a new one.
    const awareness = new awarenessProtocol.Awareness(doc);
    const identity = generateIdentity();
    placeholderNameRef.current = identity.name;
    colorRef.current = identity.color;
    awareness.setLocalStateField("user", identity);
    awarenessRef.current = awareness;

    let participants = readParticipants(awareness);

    const provider = new SyncProvider({ doc, awareness, url: resolveRelayUrl(), roomId });
    providerRef.current = provider;
    snapshotRef.current = {
      ytext,
      awareness,
      status: provider.status,
      rejectedCode: provider.rejectedCode,
      participants,
      lastRunBroadcast: null,
      broadcastRun,
    };
    notify();

    const writer = store ? createDebouncedWriter(store, roomId) : null;
    const onDocChange = () => writer?.schedule(ytext.toString());
    ytext.observe(onDocChange);

    let restoreScheduled = false;
    let restoreAttempted = false;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    // Restore only once provably alone (empty, no other participant, grace elapsed) — otherwise a peer may hold the real doc and restoring duplicates it.
    const attemptRestore = () => {
      restoreAttempted = true;
      if (store === undefined) return;
      if (ytext.length > 0) return;
      const others = readParticipants(awareness).filter((p) => p.clientId !== doc.clientID);
      if (others.length > 0) return;
      const stored = store.read(roomId);
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

    const unsubscribeRunBroadcast = provider.onRunBroadcast((id, requestedBy) => {
      snapshotRef.current = { ...snapshotRef.current, lastRunBroadcast: { id, requestedBy } };
      notify();
    });

    return () => {
      if (restoreTimer !== null) clearTimeout(restoreTimer);
      writer?.cancel();
      ytext.unobserve(onDocChange);
      awareness.off("change", onAwarenessChange);
      unsubscribe();
      unsubscribeRunBroadcast();
      provider.destroy();
      awareness.destroy();
      doc.destroy();
      awarenessRef.current = null;
      providerRef.current = null;
      snapshotRef.current = DISCONNECTED_SNAPSHOT;
      notify();
    };
  }, [roomId, notify, broadcastRun]);

  // Runs after the effect above on every commit, so a stored alias overwrites the init placeholder and updates live if picked mid-room.
  useEffect(() => {
    const awareness = awarenessRef.current;
    if (awareness === null) return;
    const name = alias ?? placeholderNameRef.current;
    if (name === null) return;
    awareness.setLocalStateField("user", { name, color: colorRef.current });
  }, [roomId, alias]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
