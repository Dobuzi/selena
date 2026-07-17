import { createHash } from "crypto";
import type { Subject } from "./types";

export function normalizeLabel(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function makeRoomId(
  schoolName: string,
  examHallName: string,
  subject: Subject,
): string {
  const key = `${normalizeLabel(schoolName)}|${normalizeLabel(examHallName)}|${subject}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}
