import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { identityCodec, type Codec } from "./codec";
import { backoffDelay, defaultBackoffOptions, type BackoffOptions } from "./backoff";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const READY_STATE_OPEN = 1;
const STABLE_CONNECTION_MS = 5_000;

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
  url: string;
  roomId: string;
  codec?: Codec;
  createWebSocket?: WebSocketFactory;
  backoff?: BackoffOptions;
  random?: () => number;
};

export class SyncProvider {
  private readonly doc: Y.Doc;
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
  private sendChain: Promise<void> = Promise.resolve();
  private connectedAt = 0;

  constructor(options: SyncProviderOptions) {
    this.doc = options.doc;
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
      syncProtocol.writeUpdate(encoder, update);
      this.send(encoding.toUint8Array(encoder));
    };
    this.doc.on("update", this.updateHandler);

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
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.doc.off("update", this.updateHandler);
    this.teardownSocket();
    this.setStatus("disconnected");
    this.statusListeners.clear();
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private teardownSocket(): void {
    const socket = this.socket;
    if (socket === null) return;
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
    this.socket = null;
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
    syncProtocol.writeSyncStep1(syncEncoder, this.doc);
    this.send(encoding.toUint8Array(syncEncoder));
  }

  private async handleMessage(raw: Uint8Array): Promise<void> {
    const bytes = await this.codec.decode(raw);
    const decoder = decoding.createDecoder(bytes);
    const encoder = encoding.createEncoder();
    syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
    if (encoding.length(encoder) > 0) {
      this.send(encoding.toUint8Array(encoder));
    }
  }

  // Serialised so an async codec cannot reorder frames on the wire.
  private send(bytes: Uint8Array): void {
    this.sendChain = this.sendChain.then(async () => {
      this.write(await this.codec.encode(bytes));
    });
  }

  private write(bytes: Uint8Array): void {
    const socket = this.socket;
    if (this.destroyed || socket === null || socket.readyState !== READY_STATE_OPEN) return;
    socket.send(bytes);
  }
}
