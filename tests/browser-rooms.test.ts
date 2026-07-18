// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  _resetBrowserRoomsForTests,
  browserAnswer,
  browserCreateOrJoin,
  browserGetRoom,
  browserLeave,
  browserRematch,
  browserStart,
  subscribeBrowserRoom,
} from "@/lib/browser-rooms";
import { makeRoomId } from "@/lib/room-id";
import { REVEAL_MS, TIME_LIMIT_MS } from "@/lib/constants";

beforeEach(() => {
  _resetBrowserRoomsForTests();
  sessionStorage.clear();
  localStorage.clear();
});

describe("browserCreateOrJoin", () => {
  it("create then getRoom finds lobby", () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "빛가온초",
      examHallName: "1-1",
      subject: "math",
      difficulty: "easy",
      nickname: "도아",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const room = browserGetRoom(created.room.roomId);
    expect(room).not.toBeNull();
    expect(room!.status).toBe("lobby");
    expect(room!.players).toHaveLength(1);
    expect(room!.hostPlayerId).toBe(created.playerId);
  });

  it("join after create on same browser succeeds (same school/hall/subject)", () => {
    const host = browserCreateOrJoin({
      intent: "create",
      schoolName: "S",
      examHallName: "H",
      subject: "math",
      difficulty: "medium",
      nickname: "호스트",
    });
    expect(host.ok).toBe(true);
    if (!host.ok) return;

    const guest = browserCreateOrJoin({
      intent: "join",
      schoolName: "S",
      examHallName: "H",
      subject: "math",
      nickname: "게스트",
    });
    expect(guest.ok).toBe(true);
    if (!guest.ok) return;
    expect(guest.room.players).toHaveLength(2);
    expect(guest.room.roomId).toBe(host.room.roomId);
  });

  it("join with different subject is a different room", () => {
    browserCreateOrJoin({
      intent: "create",
      schoolName: "S",
      examHallName: "H",
      subject: "math",
      nickname: "A",
    });
    const other = browserCreateOrJoin({
      intent: "join",
      schoolName: "S",
      examHallName: "H",
      subject: "korean",
      nickname: "B",
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    // auto-create for missing subject key → alone in new room
    expect(other.room.players).toHaveLength(1);
    expect(other.room.subject).toBe("korean");
  });

  it("join when room missing auto-creates (Pages no dead-end)", () => {
    const r = browserCreateOrJoin({
      intent: "join",
      schoolName: "새학교",
      examHallName: "새시험장",
      subject: "english",
      nickname: "첫입장",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.room.players).toHaveLength(1);
    expect(browserGetRoom(r.room.roomId)?.status).toBe("lobby");
  });

  it("rejects empty school/hall/nickname", () => {
    expect(
      browserCreateOrJoin({
        intent: "create",
        schoolName: " ",
        examHallName: "H",
        subject: "math",
        nickname: "N",
      }).ok,
    ).toBe(false);
    expect(
      browserCreateOrJoin({
        intent: "create",
        schoolName: "S",
        examHallName: " ",
        subject: "math",
        nickname: "N",
      }).ok,
    ).toBe(false);
    expect(
      browserCreateOrJoin({
        intent: "create",
        schoolName: "S",
        examHallName: "H",
        subject: "math",
        nickname: "  ",
      }).ok,
    ).toBe(false);
  });

  it("persists rooms across memory reset via localStorage", () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "Persist",
      examHallName: "1",
      subject: "science",
      nickname: "P",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.room.roomId;

    // Simulate soft reload: clear in-memory but keep localStorage
    const raw = localStorage.getItem("selena:browser-rooms:v1");
    expect(raw).toBeTruthy();
    _resetBrowserRoomsForTests();
    // put back localStorage (reset clears it)
    localStorage.setItem("selena:browser-rooms:v1", raw!);

    const reloaded = browserGetRoom(id);
    expect(reloaded?.schoolName).toBe("Persist");
    expect(reloaded?.players[0]?.nickname).toBe("P");
  });
});

describe("browserStart / answer / leave", () => {
  it("solo start uses fallback questions and can answer", () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "Solo",
      examHallName: "1",
      subject: "math",
      difficulty: "easy",
      nickname: "나",
    });
    if (!created.ok) throw new Error("create");
    const started = browserStart(created.room.roomId, created.playerId);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.room.status).toBe("battling");
    expect(started.room.mode).toBe("solo");
    expect(started.room.currentQuestion).not.toBeNull();
    expect(started.room.usedFallback).toBe(true);

    const ans = browserAnswer(created.room.roomId, created.playerId, 0);
    expect(ans.ok).toBe(true);
    if (!ans.ok) return;
    expect(["reveal", "finished"]).toContain(ans.room.battlePhase ?? ans.room.status);
  });

  it("multi requires 2 players and both can answer", () => {
    const a = browserCreateOrJoin({
      intent: "create",
      schoolName: "Multi",
      examHallName: "M",
      subject: "math",
      nickname: "A",
    });
    const b = browserCreateOrJoin({
      intent: "join",
      schoolName: "Multi",
      examHallName: "M",
      subject: "math",
      nickname: "B",
    });
    if (!a.ok || !b.ok) throw new Error("setup");
    const started = browserStart(a.room.roomId, a.playerId);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.room.mode).toBe("multi");

    const a1 = browserAnswer(a.room.roomId, a.playerId, 0);
    expect(a1.ok).toBe(true);
    if (!a1.ok) return;
    // still answering until B submits
    expect(a1.room.battlePhase === "answering" || a1.room.battlePhase === "reveal").toBe(
      true,
    );

    const b1 = browserAnswer(a.room.roomId, b.playerId, 1);
    expect(b1.ok).toBe(true);
    if (!b1.ok) return;
    expect(b1.room.battlePhase).toBe("reveal");
  });

  it("leave removes player and deletes empty room", () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "Leave",
      examHallName: "L",
      subject: "math",
      nickname: "Alone",
    });
    if (!created.ok) throw new Error("create");
    browserLeave(created.room.roomId, created.playerId);
    expect(browserGetRoom(created.room.roomId)).toBeNull();
  });

  it("rematch returns to lobby after solo finishes", () => {
    vi.useFakeTimers();
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "Rematch",
      examHallName: "R",
      subject: "math",
      nickname: "R",
    });
    if (!created.ok) throw new Error("create");
    browserStart(created.room.roomId, created.playerId);

    // Drain HP with timeouts (3 wrong → lose)
    for (let i = 0; i < 5; i++) {
      let view = browserGetRoom(created.room.roomId)!;
      if (view.status === "finished") break;
      if (view.battlePhase === "answering") {
        browserAnswer(created.room.roomId, created.playerId, null);
      }
      view = browserGetRoom(created.room.roomId)!;
      if (view.battlePhase === "reveal") {
        vi.advanceTimersByTime(REVEAL_MS + 100);
        browserGetRoom(created.room.roomId);
      }
      if (view.status === "battling" && view.battlePhase === "answering") {
        vi.advanceTimersByTime(TIME_LIMIT_MS + 100);
        browserGetRoom(created.room.roomId);
      }
    }

    const finished = browserGetRoom(created.room.roomId)!;
    expect(finished.status).toBe("finished");

    const rem = browserRematch(created.room.roomId, created.playerId);
    expect(rem.ok).toBe(true);
    if (rem.ok) {
      expect(rem.room.status).toBe("lobby");
      expect(rem.room.mode).toBeNull();
    }
    vi.useRealTimers();
  });
});

describe("room id stability", () => {
  it("matches makeRoomId key used by browser rooms", () => {
    const id = makeRoomId("  선린  중  ", "3-1  반", "math");
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "선린 중",
      examHallName: "3-1 반",
      subject: "math",
      nickname: "N",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.room.roomId).toBe(id);
  });
});

describe("browserGetRoom must not re-notify infinitely", () => {
  it("subscribe + repeated getRoom does not stack-overflow", () => {
    const created = browserCreateOrJoin({
      intent: "create",
      schoolName: "Loop",
      examHallName: "L",
      subject: "math",
      nickname: "N",
    });
    if (!created.ok) throw new Error("create");

    let calls = 0;
    const unsub = subscribeBrowserRoom(() => {
      calls += 1;
      // Mimic useRoomSession: refresh on notify
      browserGetRoom(created.room.roomId);
    });

    // One create already notified once; another explicit get must not cascade
    browserGetRoom(created.room.roomId);
    browserGetRoom(created.room.roomId);

    expect(calls).toBeLessThan(5);
    unsub();
  });
});
