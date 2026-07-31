import { describe, expect, it } from "vitest";
import { nextWorkspaceLayout } from "@/lib/workspace/layout";

describe("nextWorkspaceLayout", () => {
  it("cycles split -> editor -> output -> split", () => {
    expect(nextWorkspaceLayout("split")).toBe("editor");
    expect(nextWorkspaceLayout("editor")).toBe("output");
    expect(nextWorkspaceLayout("output")).toBe("split");
  });
});
