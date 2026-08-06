import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import { createRoomDoc } from "./room";

// Pins two ways a Yjs full-document sync payload can silently balloon: broken item coalescing, and gc left off.

// Mirrors defaultMaxMessageSize in apps/backend-go/internal/relay/relay.go.
// Nothing enforces that these two stay equal; a change there needs a change here.
const RELAY_MAX_FRAME_BYTES = 2 * 1024 * 1024;

function syncStep2Bytes(doc: Y.Doc): number {
  const encoder = encoding.createEncoder();
  syncProtocol.writeSyncStep2(encoder, doc, Y.encodeStateVector(new Y.Doc()));
  return encoding.toUint8Array(encoder).length;
}

describe("full-document sync payload size", () => {
  it("stays near 1 byte per character when 40,000 characters are typed sequentially", () => {
    const doc = new Y.Doc();
    const ytext = doc.getText("shared");

    const charCount = 40_000;
    for (let i = 0; i < charCount; i++) {
      ytext.insert(ytext.length, "x");
    }

    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep2(encoder, doc, Y.encodeStateVector(new Y.Doc()));
    const bytes = encoding.toUint8Array(encoder).length;

    expect(bytes / charCount).toBeLessThan(1.5);
  });

  it("stays small after append-then-delete churn, because room docs enable gc", () => {
    const doc = createRoomDoc();
    const ytext = doc.getText("shared");

    for (let i = 0; i < 20_000; i++) {
      ytext.insert(0, "x");
      ytext.delete(0, 1);
    }

    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep2(encoder, doc, Y.encodeStateVector(new Y.Doc()));
    const bytes = encoding.toUint8Array(encoder).length;

    expect(bytes).toBeLessThan(5_000);
  });

  // An oversize full-sync frame closes the sender, which reconnects and resends the same frame, looping forever.
  it(
    "keeps a churn-heavy session's full sync under the relay's frame limit",
    () => {
      const doc = createRoomDoc();
      const ytext = doc.getText("shared");

      // A prime stride fragments the rope like a PRNG would (Yjs merges inserts only when contiguous) while staying reproducible.
      const stride = 7919;
      const snippet = "total = reduce(add, rows, 0)\n";
      ytext.insert(0, snippet.repeat(700));
      const held = ytext.length;

      for (let i = 0; i < 40_000; i++) {
        ytext.insert((i * stride) % ytext.length, snippet);
        const excess = ytext.length - held;
        if (excess > 0) ytext.delete(((i + 7) * stride) % (ytext.length - excess), excess);
      }

      expect(ytext.length).toBe(held);
      expect(syncStep2Bytes(doc)).toBeLessThan(RELAY_MAX_FRAME_BYTES);
    },
    15_000,
  );
});
