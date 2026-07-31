export type WorkspaceLayout = "editor" | "split" | "output";

const CYCLE: readonly WorkspaceLayout[] = ["split", "output", "editor"];

export function nextWorkspaceLayout(current: WorkspaceLayout): WorkspaceLayout {
  return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}
