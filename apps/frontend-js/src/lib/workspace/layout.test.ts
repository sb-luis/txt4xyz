import { describe, expect, it } from "vitest";
import { nextWorkspaceLayout } from "@/lib/workspace/layout";

describe("nextWorkspaceLayout", () => {
  it("cycles split -> output -> editor -> split", () => {
    expect(nextWorkspaceLayout("split")).toBe("output");
    expect(nextWorkspaceLayout("output")).toBe("editor");
    expect(nextWorkspaceLayout("editor")).toBe("split");
  });
});
