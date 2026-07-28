import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import { createRoomDoc } from "./room";

// Pins two ways a Yjs full-document sync payload can silently balloon: broken
// item coalescing during sequential typing, and garbage collection left off.
// Both regressions would still "work" functionally, just at far higher cost.
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
});
