import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const textEncoder = new TextEncoder();

// Bytes, not JS string length, which undercounts multi-byte characters.
export function byteLength(doc: string): number {
  return textEncoder.encode(doc).length;
}
