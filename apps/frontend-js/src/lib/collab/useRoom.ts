import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import * as Y from "yjs";
import { SyncProvider, type ConnectionStatus } from "./provider";

export function relayUrl(): string {
  const configured = import.meta.env.VITE_RELAY_URL;
  if (configured) return configured;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export interface UseRoomResult {
  ytext: Y.Text | null;
  status: ConnectionStatus;
}

const DISCONNECTED_SNAPSHOT: UseRoomResult = { ytext: null, status: "disconnected" };

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

    const provider = new SyncProvider({ doc, url: relayUrl(), roomId });
    snapshotRef.current = { ytext, status: provider.status };
    notify();

    const unsubscribe = provider.onStatusChange((status) => {
      snapshotRef.current = { ...snapshotRef.current, status };
      notify();
    });

    return () => {
      unsubscribe();
      provider.destroy();
      doc.destroy();
      snapshotRef.current = DISCONNECTED_SNAPSHOT;
      notify();
    };
  }, [roomId, seed, notify]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
