/** Shared room navigation helpers (server + static Pages). */

export const PENDING_ROOM_KEY = "selena:pendingRoomId";

export function rememberRoomId(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_ROOM_KEY, roomId);
  } catch {
    /* private mode */
  }
}

export function resolveRoomId(fromQuery: string | null | undefined): string {
  const q = (fromQuery ?? "").trim();
  if (q) {
    rememberRoomId(q);
    return q;
  }
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PENDING_ROOM_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Path for Next router (basePath applied automatically). */
export function roomHref(roomId: string): string {
  // trailingSlash: true on static export → prefer /room/?id=
  return `/room/?id=${encodeURIComponent(roomId)}`;
}
