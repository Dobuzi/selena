// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  PENDING_ROOM_KEY,
  rememberRoomId,
  resolveRoomId,
  roomHref,
} from "@/lib/room-nav";

beforeEach(() => {
  sessionStorage.clear();
});

describe("roomHref", () => {
  it("uses trailing slash and encoded id (static export safe)", () => {
    expect(roomHref("abc123")).toBe("/room/?id=abc123");
    expect(roomHref("a&b")).toBe("/room/?id=a%26b");
  });
});

describe("rememberRoomId / resolveRoomId", () => {
  it("prefers query id and persists it", () => {
    expect(resolveRoomId("room-from-query")).toBe("room-from-query");
    expect(sessionStorage.getItem(PENDING_ROOM_KEY)).toBe("room-from-query");
  });

  it("falls back to sessionStorage when query is empty", () => {
    rememberRoomId("stored-room");
    expect(resolveRoomId(null)).toBe("stored-room");
    expect(resolveRoomId("")).toBe("stored-room");
    expect(resolveRoomId("   ")).toBe("stored-room");
  });

  it("returns empty when nothing is stored", () => {
    expect(resolveRoomId(null)).toBe("");
  });

  it("covers the Pages bug: lost query still recovers room id", () => {
    // Simulate home → navigate with remember, then room page without query
    rememberRoomId("post-navigate-id");
    expect(resolveRoomId(undefined)).toBe("post-navigate-id");
  });
});
