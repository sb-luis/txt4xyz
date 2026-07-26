import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

class DumbRelay {
  private readonly peers = new Map<string, (bytes: Uint8Array) => void>();
  private readonly queue: Array<{ from: string; bytes: Uint8Array }> = [];

  join(name: string, onMessage: (bytes: Uint8Array) => void) {
    this.peers.set(name, onMessage);
    return (bytes: Uint8Array) => this.queue.push({ from: name, bytes });
  }

  flush() {
    while (this.queue.length > 0) {
      const { from, bytes } = this.queue.shift()!;
      for (const [peer, deliver] of this.peers) {
        if (peer !== from) deliver(bytes);
      }
    }
  }
}

function connect(doc: Y.Doc, name: string, relay: DumbRelay) {
  const send = relay.join(name, (message) => {
    const decoder = decoding.createDecoder(message);
    const encoder = encoding.createEncoder();
    syncProtocol.readSyncMessage(decoder, encoder, doc, relay);
    if (encoding.length(encoder) > 0) {
      send(encoding.toUint8Array(encoder));
    }
  });

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin === relay) return;
    const encoder = encoding.createEncoder();
    syncProtocol.writeUpdate(encoder, update);
    send(encoding.toUint8Array(encoder));
  });

  const encoder = encoding.createEncoder();
  syncProtocol.writeSyncStep1(encoder, doc);
  send(encoding.toUint8Array(encoder));

  return send;
}

function sharedText(doc: Y.Doc) {
  return doc.getText("shared");
}

describe("a stateless relay is enough for Yjs docs to converge", () => {
  it("lets a client that joins after the fact catch up to edits it never saw happen", () => {
    const relay = new DumbRelay();
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    connect(docA, "A", relay);
    connect(docB, "B", relay);
    relay.flush();

    sharedText(docA).insert(0, "hello ");
    relay.flush();
    sharedText(docB).insert(sharedText(docB).length, "world");
    relay.flush();

    const docC = new Y.Doc();
    connect(docC, "C", relay);
    relay.flush();

    expect(sharedText(docC).toString()).toBe("hello world");
    expect(sharedText(docC).toString()).toBe(sharedText(docA).toString());
    expect(sharedText(docC).toString()).toBe(sharedText(docB).toString());
  });
});
