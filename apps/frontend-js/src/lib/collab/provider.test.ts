import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { SyncProvider, type WebSocketLike } from "./provider";
import type { Codec } from "./codec";
import { backoffDelay, defaultBackoffOptions } from "./backoff";

type NodeProcessLike = {
  on(event: "unhandledRejection", listener: (reason: unknown) => void): void;
  off(event: "unhandledRejection", listener: (reason: unknown) => void): void;
};

function newDocAndAwareness() {
  const doc = new Y.Doc();
  return { doc, awareness: new awarenessProtocol.Awareness(doc) };
}

class FakeSocket implements WebSocketLike {
  binaryType = "";
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  sent: Uint8Array[] = [];
  closeCalls = 0;

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  send(data: Uint8Array) {
    this.sent.push(data.slice());
  }

  close() {
    this.closeCalls += 1;
    this.readyState = 3;
    this.onclose?.();
  }

  receive(bytes: Uint8Array) {
    this.onmessage?.({ data: bytes.buffer as ArrayBuffer });
  }
}

async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function readRoomId(frame: Uint8Array): string {
  return new TextDecoder().decode(frame);
}

describe("room id framing", () => {
  it("sends the room id as the very first frame, before any sync traffic", async () => {
    const sockets: FakeSocket[] = [];
    const provider = new SyncProvider({
      ...newDocAndAwareness(),
      url: "wss://example.invalid/relay",
      roomId: "top-secret-room",
      createWebSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    sockets[0].open();
    await flushMicrotasks();

    expect(sockets[0].sent.length).toBeGreaterThanOrEqual(2);
    expect(readRoomId(sockets[0].sent[0])).toBe("top-secret-room");

    provider.destroy();
  });

  it("never appears in the connection url", () => {
    const sockets: FakeSocket[] = [];
    let requestedUrl = "";
    const provider = new SyncProvider({
      ...newDocAndAwareness(),
      url: "wss://example.invalid/relay",
      roomId: "top-secret-room",
      createWebSocket: (url) => {
        requestedUrl = url;
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    expect(requestedUrl).toBe("wss://example.invalid/relay");
    expect(requestedUrl).not.toContain("top-secret-room");

    provider.destroy();
  });
});

describe("reconnect backoff", () => {
  it("keeps backing off when a relay accepts the socket then rejects the connection", async () => {
    const sockets: FakeSocket[] = [];
    vi.useFakeTimers();

    const provider = new SyncProvider({
      ...newDocAndAwareness(),
      url: "wss://example.invalid/relay",
      roomId: "rejected",
      random: () => 1,
      createWebSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    for (let i = 0; i < 3; i++) {
      sockets[sockets.length - 1].open();
      sockets[sockets.length - 1].close();
      await vi.advanceTimersByTimeAsync(60_000);
    }

    const settled = sockets.length;
    sockets[settled - 1].open();
    sockets[settled - 1].close();
    await vi.advanceTimersByTimeAsync(defaultBackoffOptions.baseMs * 2);

    expect(sockets.length).toBe(settled);

    provider.destroy();
    vi.useRealTimers();
  });
});

describe("the encode/decode seam", () => {
  it("leaves the room id frame readable by a relay that has no codec", async () => {
    const sockets: FakeSocket[] = [];
    const encrypting: Codec = {
      encode: (bytes) => Uint8Array.from(bytes, (b) => b ^ 0xff),
      decode: (bytes) => Uint8Array.from(bytes, (b) => b ^ 0xff),
    };

    const provider = new SyncProvider({
      ...newDocAndAwareness(),
      url: "wss://example.invalid/relay",
      roomId: "routable-room",
      codec: encrypting,
      createWebSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    sockets[0].open();
    await flushMicrotasks();

    expect(readRoomId(sockets[0].sent[0])).toBe("routable-room");

    provider.destroy();
  });


  function markerCodec(calls: { encoded: number; decoded: number }): Codec {
    return {
      encode: (bytes) => {
        calls.encoded += 1;
        const out = new Uint8Array(bytes.length + 1);
        out.set(bytes);
        out[bytes.length] = 0xab;
        return out;
      },
      decode: (bytes) => {
        calls.decoded += 1;
        if (bytes[bytes.length - 1] !== 0xab) {
          throw new Error("frame missing seam marker: encode was bypassed");
        }
        return bytes.slice(0, -1);
      },
    };
  }

  it("routes every outbound payload through encode and every inbound payload through decode", async () => {
    const callsA = { encoded: 0, decoded: 0 };
    const callsB = { encoded: 0, decoded: 0 };
    let socketA!: FakeSocket;
    let socketB!: FakeSocket;

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new SyncProvider({
      doc: docA,
      awareness: new awarenessProtocol.Awareness(docA),
      url: "wss://example.invalid/relay",
      roomId: "room",
      codec: markerCodec(callsA),
      createWebSocket: () => {
        socketA = new FakeSocket();
        return socketA;
      },
    });
    const providerB = new SyncProvider({
      doc: docB,
      awareness: new awarenessProtocol.Awareness(docB),
      url: "wss://example.invalid/relay",
      roomId: "room",
      codec: markerCodec(callsB),
      createWebSocket: () => {
        socketB = new FakeSocket();
        return socketB;
      },
    });

    // A real relay authenticates and consumes each peer's first frame (the
    // room id) rather than forwarding it — this fake relay does the same,
    // forwarding only the sync traffic that follows.
    socketA.send = function (data: Uint8Array) {
      FakeSocket.prototype.send.call(this, data);
      if (this.sent.length > 1) socketB.receive(data);
    };
    socketB.send = function (data: Uint8Array) {
      FakeSocket.prototype.send.call(this, data);
      if (this.sent.length > 1) socketA.receive(data);
    };

    socketA.open();
    socketB.open();
    await flushMicrotasks();

    docA.getText("shared").insert(0, "hello");
    await flushMicrotasks();

    expect(docB.getText("shared").toString()).toBe("hello");
    expect(callsA.encoded).toBeGreaterThan(0);
    expect(callsB.decoded).toBeGreaterThan(0);
    // Every frame either provider received had to pass its decode() to be
    // understood at all, which only succeeds if the sender's encode() ran —
    // a send site that bypassed encode() would produce a frame missing the
    // marker and readSyncMessage would never have converged the docs above.
    expect(docA.getText("shared").toString()).toBe(docB.getText("shared").toString());

    providerA.destroy();
    providerB.destroy();
  });
});

describe("reconnect backoff", () => {
  it("grows with each attempt and is capped at the configured maximum", () => {
    const zero = () => 0;
    const one = () => 1;

    const delays = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((attempt) => backoffDelay(attempt, zero));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
    expect(Math.max(...delays)).toBeLessThanOrEqual(defaultBackoffOptions.maxMs);

    const cappedDelay = backoffDelay(20, one);
    expect(cappedDelay).toBeLessThanOrEqual(defaultBackoffOptions.maxMs);
    expect(cappedDelay).toBeGreaterThan(defaultBackoffOptions.maxMs * 0.9);
  });

  it("applies jitter so identical attempts do not produce identical delays", () => {
    let seed = 0;
    const sequence = [0.1, 0.9];
    const random = () => sequence[seed++ % sequence.length];

    const first = backoffDelay(2, random);
    const second = backoffDelay(2, random);
    expect(first).not.toBe(second);
  });

  it("reconnects after a socket close and grows the delay across repeated drops", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const provider = new SyncProvider({
      ...newDocAndAwareness(),
      url: "wss://example.invalid/relay",
      roomId: "room",
      random: () => 0.5,
      createWebSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    sockets[0].open();
    sockets[0].close();
    const firstDelay = backoffDelay(0, () => 0.5);
    expect(provider.status).toBe("disconnected");

    vi.advanceTimersByTime(firstDelay + 1);
    expect(sockets.length).toBe(2);

    sockets[1].open();
    sockets[1].close();
    const secondDelay = backoffDelay(1, () => 0.5);
    expect(secondDelay).toBeGreaterThan(firstDelay);

    vi.advanceTimersByTime(secondDelay + 1);
    expect(sockets.length).toBe(3);

    provider.destroy();
    vi.useRealTimers();
  });
});

describe("destroy", () => {
  let provider: SyncProvider | null = null;

  afterEach(() => {
    provider?.destroy();
    provider = null;
    vi.useRealTimers();
  });

  it("closes the socket, stops listening for doc updates, and cancels any pending reconnect", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const doc = new Y.Doc();
    // Awareness itself keeps an outdated-state check interval alive; destroy
    // it explicitly (as useRoom does) so it doesn't skew the timer count this
    // test cares about.
    const awareness = new awarenessProtocol.Awareness(doc);
    provider = new SyncProvider({
      doc,
      awareness,
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    sockets[0].open();
    sockets[0].close();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    provider.destroy();
    awareness.destroy();

    expect(vi.getTimerCount()).toBe(0);
    expect(sockets.length).toBe(1);

    vi.advanceTimersByTime(60_000);
    expect(sockets.length).toBe(1);

    const sentBefore = sockets[0].sent.length;
    doc.getText("shared").insert(0, "after destroy");
    expect(sockets[0].sent.length).toBe(sentBefore);

    expect(provider.status).toBe("disconnected");
  });

  it("closes a still-open socket once the queued awareness removal frame is written", async () => {
    const sockets: FakeSocket[] = [];
    provider = new SyncProvider({
      ...newDocAndAwareness(),
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    sockets[0].open();
    await flushMicrotasks();
    provider.destroy();
    // The socket must not close synchronously: destroy() queues an awareness
    // removal frame on the async send chain, and closing early would drop it.
    await flushMicrotasks();

    expect(sockets[0].closeCalls).toBe(1);
    expect(sockets[0].onopen).toBeNull();
    expect(sockets[0].onmessage).toBeNull();
  });
});

function connectPeers() {
  const { doc: docA, awareness: awarenessA } = newDocAndAwareness();
  const { doc: docB, awareness: awarenessB } = newDocAndAwareness();
  let socketA!: FakeSocket;
  let socketB!: FakeSocket;

  const providerA = new SyncProvider({
    doc: docA,
    awareness: awarenessA,
    url: "wss://example.invalid/relay",
    roomId: "room",
    createWebSocket: () => {
      socketA = new FakeSocket();
      return socketA;
    },
  });
  const providerB = new SyncProvider({
    doc: docB,
    awareness: awarenessB,
    url: "wss://example.invalid/relay",
    roomId: "room",
    createWebSocket: () => {
      socketB = new FakeSocket();
      return socketB;
    },
  });

  socketA.open();
  socketB.open();

  // A real relay authenticates and consumes each peer's first frame (the room
  // id) rather than forwarding it — this fake relay does the same.
  socketA.send = function (data: Uint8Array) {
    FakeSocket.prototype.send.call(this, data);
    if (this.sent.length > 1) socketB.receive(data);
  };
  socketB.send = function (data: Uint8Array) {
    FakeSocket.prototype.send.call(this, data);
    if (this.sent.length > 1) socketA.receive(data);
  };

  return { docA, docB, awarenessA, awarenessB, providerA, providerB };
}

describe("message envelope", () => {
  it("routes an awareness frame and a sync frame across the same socket to the right handler", async () => {
    const { docA, docB, awarenessA, awarenessB, providerA, providerB } = connectPeers();
    await flushMicrotasks();

    docA.getText("shared").insert(0, "hello");
    awarenessA.setLocalStateField("user", { name: "ava", color: "oklch(0.8 0.1 200)" });
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(docB.getText("shared").toString()).toBe("hello");
    expect(awarenessB.getStates().get(docA.clientID)?.user).toEqual({
      name: "ava",
      color: "oklch(0.8 0.1 200)",
    });

    providerA.destroy();
    providerB.destroy();
  });

  it("ignores an unknown message type instead of throwing", async () => {
    const { doc, awareness } = newDocAndAwareness();
    let socket!: FakeSocket;
    const provider = new SyncProvider({
      doc,
      awareness,
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        socket = new FakeSocket();
        return socket;
      },
    });

    socket.open();
    await flushMicrotasks();

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 7);
    encoding.writeVarString(encoder, "a future run-broadcast message");

    // handleMessage runs detached from the onmessage callback (`void this.handleMessage(...)`),
    // so a throw inside it surfaces as an unhandled rejection rather than a
    // synchronous exception — that's what an unknown type must not produce.
    const nodeProcess = (globalThis as { process?: NodeProcessLike }).process;
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    nodeProcess?.on("unhandledRejection", onRejection);

    socket.receive(encoding.toUint8Array(encoder));
    await new Promise((resolve) => setTimeout(resolve, 0));

    nodeProcess?.off("unhandledRejection", onRejection);

    expect(rejections).toEqual([]);
    expect(provider.status).toBe("connected");
    provider.destroy();
  });
});

describe("awareness coalescing", () => {
  it("coalesces a burst of local awareness changes into a single frame, but never coalesces sync updates", async () => {
    const { doc, awareness } = newDocAndAwareness();
    let socket!: FakeSocket;
    const provider = new SyncProvider({
      doc,
      awareness,
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        socket = new FakeSocket();
        return socket;
      },
    });

    socket.open();
    await flushMicrotasks();

    const sentBeforeBurst = socket.sent.length;
    for (let i = 0; i < 5; i++) {
      awareness.setLocalStateField("cursor", { pos: i });
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(socket.sent.length - sentBeforeBurst).toBe(1);

    const sentBeforeSyncBurst = socket.sent.length;
    for (let i = 0; i < 5; i++) {
      doc.getText("shared").insert(i, "x");
    }
    await flushMicrotasks();
    expect(socket.sent.length - sentBeforeSyncBurst).toBe(5);

    provider.destroy();
  });
});

describe("awareness announce-to-newcomer", () => {
  // A relay that forwards every frame after the room-id handshake frame to
  // every other member currently in the room, the same fan-out a real room
  // provides.
  class RelaySocket extends FakeSocket {
    label = "?";
    private firstFrameSwallowed = false;
    private relay: RelayBus | null = null;

    join(relay: RelayBus) {
      this.relay = relay;
      relay.members.push(this);
    }

    send(data: Uint8Array) {
      super.send(data);
      if (!this.firstFrameSwallowed) {
        this.firstFrameSwallowed = true;
        return;
      }
      for (const member of this.relay?.members ?? []) {
        if (member !== this) member.receive(data);
      }
    }
  }

  class RelayBus {
    members: RelaySocket[] = [];
  }

  const MESSAGE_AWARENESS_TYPE = 1;

  function countAwarenessFrames(socket: RelaySocket): number {
    return socket.sent.filter((frame) => {
      const decoder = decoding.createDecoder(frame);
      return decoding.readVarUint(decoder) === MESSAGE_AWARENESS_TYPE;
    }).length;
  }

  it("makes an already-connected peer announce itself to a newcomer, and terminates instead of echoing forever", async () => {
    const relay = new RelayBus();

    const { doc: docA, awareness: awarenessA } = newDocAndAwareness();
    awarenessA.setLocalStateField("user", { name: "ava", color: "oklch(0.8 0.1 200)" });
    let socketA!: RelaySocket;
    const providerA = new SyncProvider({
      doc: docA,
      awareness: awarenessA,
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        socketA = new RelaySocket();
        socketA.label = "A";
        socketA.join(relay);
        return socketA;
      },
    });
    socketA.open();
    await flushMicrotasks();

    // A is alone in the room at this point: its handshake announce had no one
    // to reach, mirroring the pre-fix bug where a joiner's participant list
    // showed only themselves until an existing peer moved a cursor.
    expect(awarenessA.getStates().has(docA.clientID)).toBe(true);

    const { doc: docB, awareness: awarenessB } = newDocAndAwareness();
    awarenessB.setLocalStateField("user", { name: "bo", color: "oklch(0.8 0.1 30)" });
    let socketB!: RelaySocket;
    const providerB = new SyncProvider({
      doc: docB,
      awareness: awarenessB,
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        socketB = new RelaySocket();
        socketB.label = "B";
        socketB.join(relay);
        return socketB;
      },
    });
    socketB.open();
    await flushMicrotasks();

    // Two coalesce rounds: B's handshake reaches A, A replies, B replies once
    // more to that reply, then A already knows B and stays silent.
    await new Promise((resolve) => setTimeout(resolve, 80));
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(awarenessA.getStates().has(docB.clientID)).toBe(true);
    expect(awarenessB.getStates().has(docA.clientID)).toBe(true);

    const framesAfterConvergence = {
      a: countAwarenessFrames(socketA),
      b: countAwarenessFrames(socketB),
    };

    // Give any runaway echo a further window to manifest.
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(countAwarenessFrames(socketA)).toBe(framesAfterConvergence.a);
    expect(countAwarenessFrames(socketB)).toBe(framesAfterConvergence.b);

    providerA.destroy();
    providerB.destroy();
  });
});

describe("no ghost cursors", () => {
  it("removes the local awareness state and broadcasts the removal when destroyed", async () => {
    const { doc, awareness } = newDocAndAwareness();
    let socket!: FakeSocket;
    const provider = new SyncProvider({
      doc,
      awareness,
      url: "wss://example.invalid/relay",
      roomId: "room",
      createWebSocket: () => {
        socket = new FakeSocket();
        return socket;
      },
    });

    socket.open();
    await flushMicrotasks();
    expect(awareness.getStates().has(doc.clientID)).toBe(true);

    provider.destroy();
    await flushMicrotasks();

    expect(awareness.getStates().has(doc.clientID)).toBe(false);

    const lastFrame = socket.sent[socket.sent.length - 1];
    const decoder = decoding.createDecoder(lastFrame);
    expect(decoding.readVarUint(decoder)).toBe(1);
  });
});
