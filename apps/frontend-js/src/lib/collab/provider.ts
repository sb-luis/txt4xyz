import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { identityCodec, type Codec } from "./codec";
import { backoffDelay, defaultBackoffOptions, type BackoffOptions } from "./backoff";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const READY_STATE_OPEN = 1;
const STABLE_CONNECTION_MS = 5_000;

// y-websocket's convention: a leading varUint lets awareness share the socket
// with sync, and leaves room for Phase 3's run broadcast.
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const AWARENESS_COALESCE_MS = 50;

export type WebSocketLike = {
  binaryType: string;
  readyState: number;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null;
  send(data: Uint8Array): void;
  close(): void;
};

export type WebSocketFactory = (url: string) => WebSocketLike;

const defaultWebSocketFactory: WebSocketFactory = (url) =>
  new WebSocket(url) as unknown as WebSocketLike;

export type SyncProviderOptions = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  url: string;
  roomId: string;
  codec?: Codec;
  createWebSocket?: WebSocketFactory;
  backoff?: BackoffOptions;
  random?: () => number;
};

export class SyncProvider {
  private readonly doc: Y.Doc;
  private readonly awareness: awarenessProtocol.Awareness;
  private readonly url: string;
  private readonly roomId: string;
  private readonly codec: Codec;
  private readonly createWebSocket: WebSocketFactory;
  private readonly backoffOptions: BackoffOptions;
  private readonly random: () => number;

  private socket: WebSocketLike | null = null;
  private destroyed = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentStatus: ConnectionStatus = "disconnected";
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly updateHandler: (update: Uint8Array, origin: unknown) => void;
  private readonly awarenessUpdateHandler: (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => void;
  private readonly handleUnload: () => void;
  private readonly pendingAwarenessClients = new Set<number>();
  private awarenessTimer: ReturnType<typeof setTimeout> | null = null;
  private sendChain: Promise<void> = Promise.resolve();
  private connectedAt = 0;

  constructor(options: SyncProviderOptions) {
    this.doc = options.doc;
    this.awareness = options.awareness;
    this.url = options.url;
    this.roomId = options.roomId;
    this.codec = options.codec ?? identityCodec;
    this.createWebSocket = options.createWebSocket ?? defaultWebSocketFactory;
    this.backoffOptions = options.backoff ?? defaultBackoffOptions;
    this.random = options.random ?? Math.random;

    this.updateHandler = (update, origin) => {
      if (origin === this) return;
      if (this.currentStatus !== "connected") return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      this.send(encoding.toUint8Array(encoder));
    };
    this.doc.on("update", this.updateHandler);

    // A change with origin === this arrived from the relay, which already fanned
    // it out to every other member; re-broadcasting it would only echo. The
    // exception is a newcomer (in `added`): they joined after our own handshake
    // announce had anyone to reach, so we owe them one reply of our own state.
    // Once they have it, our next update carries no new `added` entries, so this
    // terminates in a single reply per side rather than echoing forever.
    this.awarenessUpdateHandler = (changes, origin) => {
      if (origin === this) {
        if (changes.added.length > 0) {
          this.pendingAwarenessClients.add(this.doc.clientID);
          this.scheduleAwarenessFlush();
        }
        return;
      }
      for (const clientId of changes.added.concat(changes.updated, changes.removed)) {
        this.pendingAwarenessClients.add(clientId);
      }
      this.scheduleAwarenessFlush();
    };
    this.awareness.on("update", this.awarenessUpdateHandler);

    this.handleUnload = () => this.destroy();
    window.addEventListener("beforeunload", this.handleUnload);
    window.addEventListener("pagehide", this.handleUnload);

    this.connect();
  }

  get status(): ConnectionStatus {
    return this.currentStatus;
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.awarenessTimer !== null) {
      clearTimeout(this.awarenessTimer);
      this.awarenessTimer = null;
    }
    window.removeEventListener("beforeunload", this.handleUnload);
    window.removeEventListener("pagehide", this.handleUnload);
    this.doc.off("update", this.updateHandler);
    this.awareness.off("update", this.awarenessUpdateHandler);
    this.removeLocalAwarenessState();
    // The removal frame queued above rides the async codec-backed send chain,
    // so closing the socket now would drop it and strand a ghost cursor.
    const socket = this.socket;
    void this.sendChain.then(() => {
      if (socket !== null) {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.close();
      }
      if (this.socket === socket) this.socket = null;
    });
    this.setStatus("disconnected");
    this.statusListeners.clear();
  }

  // Broadcast the removal before tearing the socket down, or peers keep this
  // client's cursor on screen until the awareness outdated-timeout expires.
  private removeLocalAwarenessState(): void {
    const clientId = this.doc.clientID;
    const hadState = this.awareness.getStates().has(clientId);
    awarenessProtocol.removeAwarenessStates(this.awareness, [clientId], "local");
    if (hadState) this.broadcastAwareness([clientId]);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private connect(): void {
    if (this.destroyed) return;
    this.setStatus("connecting");

    this.sendChain = Promise.resolve();
    const socket = this.createWebSocket(this.url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.onopen = () => {
      if (this.destroyed || this.socket !== socket) return;
      this.connectedAt = Date.now();
      this.setStatus("connected");
      this.handshake();
    };

    socket.onmessage = (event) => {
      if (this.destroyed || this.socket !== socket) return;
      void this.handleMessage(new Uint8Array(event.data));
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.destroyed) return;
      // Only a connection that survived counts as success. A relay that accepts
      // the socket then rejects the room id would otherwise reset the backoff on
      // every attempt, turning reconnection into a hot loop.
      if (this.connectedAt !== 0 && Date.now() - this.connectedAt >= STABLE_CONNECTION_MS) {
        this.reconnectAttempt = 0;
      }
      this.connectedAt = 0;
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect(): void {
    const delay = backoffDelay(this.reconnectAttempt, this.random, this.backoffOptions);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // The room id is a routing header, not payload: the relay must read it to
  // dispatch, and once the codec becomes AES-GCM the relay has no key. It is
  // written raw, ahead of the send chain, so it always lands first.
  private handshake(): void {
    this.write(new TextEncoder().encode(this.roomId));

    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, this.doc);
    this.send(encoding.toUint8Array(syncEncoder));

    // So existing peers see this client's cursor immediately, and so this
    // client's own identity round-trips back once the newcomer is known.
    this.broadcastAwareness([this.doc.clientID]);
  }

  private async handleMessage(raw: Uint8Array): Promise<void> {
    const bytes = await this.codec.decode(raw);
    const decoder = decoding.createDecoder(bytes);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
        if (encoding.length(encoder) > 1) {
          this.send(encoding.toUint8Array(encoder));
        }
        break;
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readTailAsUint8Array(decoder),
          this,
        );
        break;
      }
      default:
        // A future client speaking a message type this build predates.
        break;
    }
  }

  private scheduleAwarenessFlush(): void {
    if (this.awarenessTimer !== null) return;
    this.awarenessTimer = setTimeout(() => {
      this.awarenessTimer = null;
      const clients = Array.from(this.pendingAwarenessClients);
      this.pendingAwarenessClients.clear();
      this.broadcastAwareness(clients);
    }, AWARENESS_COALESCE_MS);
  }

  private broadcastAwareness(clients: number[]): void {
    if (clients.length === 0 || this.currentStatus !== "connected") return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients));
    this.send(encoding.toUint8Array(encoder));
  }

  // Serialised so an async codec cannot reorder frames on the wire.
  private send(bytes: Uint8Array): void {
    this.sendChain = this.sendChain.then(async () => {
      this.write(await this.codec.encode(bytes));
    });
  }

  // No `destroyed` check here: destroy() itself queues the awareness-removal
  // frame onto the send chain and depends on this still writing it.
  private write(bytes: Uint8Array): void {
    const socket = this.socket;
    if (socket === null || socket.readyState !== READY_STATE_OPEN) return;
    socket.send(bytes);
  }
}
