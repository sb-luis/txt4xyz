import { readRoomIdFromHash } from "@/lib/collab/room";
import { ROOT_DOC_KEY, readStoredDoc } from "./localStore";
import { decodeCodeFromFragment } from "./shareLink";

export interface DocSession {
  key: string;
  doc: string;
}

function fragmentKey(fragment: string): string {
  let hash = 5381;
  for (let i = 0; i < fragment.length; i += 1) {
    hash = ((hash << 5) + hash + fragment.charCodeAt(i)) | 0;
  }
  return `${ROOT_DOC_KEY}:${(hash >>> 0).toString(36)}`;
}

// A shared link gets its own storage key, so opening someone else's link never
// overwrites the reader's own scratchpad, and their edits to that link survive
// a reload while the URL stays intact and copyable.
export function resolveDocSession(defaultDoc: string): DocSession {
  if (readRoomIdFromHash(window.location.hash) !== null) {
    return { key: ROOT_DOC_KEY, doc: readStoredDoc(ROOT_DOC_KEY) ?? defaultDoc };
  }

  const fragment = window.location.hash.slice(1);
  const shared = decodeCodeFromFragment(fragment);

  if (shared !== null) {
    const key = fragmentKey(fragment);
    return { key, doc: readStoredDoc(key) ?? shared };
  }

  return { key: ROOT_DOC_KEY, doc: readStoredDoc(ROOT_DOC_KEY) ?? defaultDoc };
}
