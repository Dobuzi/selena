// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRoomSession, savePlayerId } from "@/hooks/useRoomSession";
import {
  _resetBrowserRoomsForTests,
  browserCreateOrJoin,
  browserGetRoom,
} from "@/lib/browser-rooms";

describe("useRoomSession loading (static mode)", () => {
  const prevStatic = process.env.NEXT_PUBLIC_STATIC;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_STATIC = "1";
    _resetBrowserRoomsForTests();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    if (prevStatic === undefined) delete process.env.NEXT_PUBLIC_STATIC;
    else process.env.NEXT_PUBLIC_STATIC = prevStatic;
    vi.restoreAllMocks();
  });

  it("does not stay on loading forever after create → open room", async () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "로딩학교",
      examHallName: "1반",
      subject: "math",
      difficulty: "easy",
      nickname: "테스터",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    savePlayerId(created.room.roomId, created.playerId);

    const { result } = renderHook(() =>
      useRoomSession(created.room.roomId),
    );

    // Must leave loading state
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 },
    );

    expect(result.current.error).toBeNull();
    expect(result.current.room?.status).toBe("lobby");
    expect(result.current.playerId).toBe(created.playerId);
  });

  it("sets loading false when room is missing (shows error, not infinite spinner)", async () => {
    const { result } = renderHook(() => useRoomSession("does-not-exist-id"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.room).toBeNull();
    expect(result.current.error).toMatch(/찾을 수 없어요/);
  });

  it("sets loading false when roomId is empty", async () => {
    const { result } = renderHook(() => useRoomSession(""));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.room).toBeNull();
  });

  it("survives remount without stuck loading (Strict Mode style)", async () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "Strict",
      examHallName: "S",
      subject: "math",
      nickname: "N",
    });
    if (!created.ok) throw new Error("create");
    savePlayerId(created.room.roomId, created.playerId);

    const { result, unmount, rerender } = renderHook(
      ({ id }: { id: string }) => useRoomSession(id),
      { initialProps: { id: created.room.roomId } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();

    const second = renderHook(() => useRoomSession(created.room.roomId));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.room?.status).toBe("lobby");
    second.unmount();
    void rerender;
  });

  it("does not delete room on pagehide in static mode", async () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "PageHide",
      examHallName: "P",
      subject: "math",
      nickname: "N",
    });
    if (!created.ok) throw new Error("create");
    savePlayerId(created.room.roomId, created.playerId);

    const { result, unmount } = renderHook(() =>
      useRoomSession(created.room.roomId),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.room?.players.length).toBe(1);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    unmount();

    // Room must still exist in browser store (pagehide must not auto-leave)
    const still = browserGetRoom(created.room.roomId);
    expect(still?.players.length).toBe(1);
  });
});
