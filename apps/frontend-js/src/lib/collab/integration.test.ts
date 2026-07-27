// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { SyncProvider } from "./provider";

function newAwareness(doc: Y.Doc) {
  return new awarenessProtocol.Awareness(doc);
}

const URL = import.meta.env.VITE_RELAY_URL ?? "";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe.skipIf(URL === "")("real provider against the real Go relay", () => {
  it("propagates edits between two clients and lets a late joiner catch up", async () => {
    const room = "integrationroom1";
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const a = new SyncProvider({ doc: docA, awareness: newAwareness(docA), url: URL, roomId: room });
    const b = new SyncProvider({ doc: docB, awareness: newAwareness(docB), url: URL, roomId: room });
    await wait(700);

    expect(a.status).toBe("connected");
    expect(b.status).toBe("connected");

    docA.getText("shared").insert(0, "hello ");
    await wait(500);
    expect(docB.getText("shared").toString()).toBe("hello ");

    docB.getText("shared").insert(6, "world");
    await wait(500);
    expect(docA.getText("shared").toString()).toBe("hello world");

    const docC = new Y.Doc();
    const c = new SyncProvider({ doc: docC, awareness: newAwareness(docC), url: URL, roomId: room });
    await wait(900);
    expect(docC.getText("shared").toString()).toBe("hello world");

    a.destroy();
    b.destroy();
    c.destroy();
  }, 15000);

  it("keeps rooms isolated", async () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const a = new SyncProvider({ doc: docA, awareness: newAwareness(docA), url: URL, roomId: "roomalpha" });
    const b = new SyncProvider({ doc: docB, awareness: newAwareness(docB), url: URL, roomId: "roombeta" });
    await wait(700);

    docA.getText("shared").insert(0, "secret");
    await wait(500);

    expect(docB.getText("shared").toString()).toBe("");
    a.destroy();
    b.destroy();
  }, 15000);
});
