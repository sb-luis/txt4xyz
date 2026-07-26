const MAX_ROOM_ID_LEN = 128;
const ROOM_ID_PATTERN = /^[a-zA-Z0-9\-_]+$/;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateRoomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function isValidRoomId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_ROOM_ID_LEN && ROOM_ID_PATTERN.test(id);
}

export function readRoomIdFromHash(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = /^room=(.+)$/.exec(fragment);
  if (match === null) return null;
  const id = match[1];
  return isValidRoomId(id) ? id : null;
}

export function readRoomIdFromLocation(): string | null {
  return readRoomIdFromHash(window.location.hash);
}

export function roomUrl(roomId: string): string {
  const url = new URL(window.location.href);
  url.hash = `room=${roomId}`;
  return url.toString();
}
