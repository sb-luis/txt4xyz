import init, { PositionEncoding, Workspace } from "@astral-sh/ruff-wasm-web";

export class FormatError extends Error {}

let workspacePromise: Promise<Workspace> | null = null;

function getWorkspace(): Promise<Workspace> {
  workspacePromise ??= init().then(
    () => new Workspace(Workspace.defaultSettings(), PositionEncoding.Utf16),
  );
  return workspacePromise;
}

// Kicks off the wasm load without formatting anything, so callers (e.g. a
// status indicator) can track readiness independently of a specific format
// request. Shares the same singleton as formatLangPy — calling either first
// primes the other.
export function ensureFormatterReady(): Promise<Workspace> {
  return getWorkspace();
}

export async function formatLangPy(code: string): Promise<string> {
  const workspace = await getWorkspace();
  try {
    return workspace.format(code);
  } catch (error) {
    throw new FormatError(error instanceof Error ? error.message : String(error));
  }
}
