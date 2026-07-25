import { readStoredDoc } from "./localStore";
import { readCodeFromLocationHash } from "./shareLink";

export function resolveInitialDoc(defaultDoc: string): string {
  return readCodeFromLocationHash() ?? readStoredDoc() ?? defaultDoc;
}
