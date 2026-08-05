import { EditorState, Transaction } from "@codemirror/state";
import type { Extension } from "@codemirror/state";

export const DEFAULT_MAX_DOC_LENGTH = 100_000;

// Only user-originated transactions carry a userEvent annotation; remote
// (e.g. Yjs) sync updates do not. Reading it wrong must never reject a
// remote update, so an unrecognised transaction is allowed through rather
// than capped.
export function enforceDocLengthCap(maxDocLength: number): Extension {
  return EditorState.changeFilter.of((tr) => {
    if (!tr.docChanged || tr.annotation(Transaction.userEvent) === undefined) return true;
    return tr.newDoc.length <= maxDocLength;
  });
}
