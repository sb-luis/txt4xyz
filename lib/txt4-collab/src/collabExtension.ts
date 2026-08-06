import type { Extension } from "@codemirror/state";
import { yCollab, yRemoteSelectionsTheme } from "y-codemirror.next";
import type * as Y from "yjs";
import type * as awarenessProtocol from "y-protocols/awareness";

export function collabExtension(
  ytext: Y.Text,
  awareness: awarenessProtocol.Awareness | null,
): Extension {
  return [yRemoteSelectionsTheme, yCollab(ytext, awareness)];
}
