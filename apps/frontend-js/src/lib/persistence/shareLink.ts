import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

const MAX_DECODED_LENGTH = 100_000;

export function encodeCodeToFragment(code: string): string {
  return compressToEncodedURIComponent(code);
}

export function decodeCodeFromFragment(fragment: string): string | null {
  if (!fragment) return null;

  try {
    const decoded = decompressFromEncodedURIComponent(fragment);
    if (typeof decoded !== "string" || decoded.length === 0) return null;
    if (decoded.length > MAX_DECODED_LENGTH) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function buildShareUrl(code: string): string {
  const url = new URL(window.location.href);
  url.hash = encodeCodeToFragment(code);
  return url.toString();
}

export function readCodeFromLocationHash(): string | null {
  return decodeCodeFromFragment(window.location.hash.slice(1));
}
