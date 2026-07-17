import type { Subject } from "./types";

export function normalizeLabel(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Fast non-crypto hash for browser + Node (room ids need not be secret). */
function hash16(input: string): string {
  let h1 = 0xdeadbeef >>> 0;
  let h2 = 0x41c6ce57 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return Math.abs(n).toString(16).padStart(16, "0").slice(0, 16);
}

export function makeRoomId(
  schoolName: string,
  examHallName: string,
  subject: Subject,
): string {
  const key = `${normalizeLabel(schoolName)}|${normalizeLabel(examHallName)}|${subject}`;
  return hash16(key);
}
