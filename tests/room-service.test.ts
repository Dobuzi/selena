import { describe, it, expect, beforeEach } from "vitest";
import { roomStore } from "@/lib/room-store";
import { createOrJoinRoom } from "@/lib/room-service";

beforeEach(() => roomStore.clear());

describe("createOrJoinRoom", () => {
  it("create makes a new room and sets host", () => {
    const r = createOrJoinRoom({
      intent: "create",
      schoolName: "선린중",
      examHallName: "3-1",
      subject: "math",
      difficulty: "medium",
      nickname: "민수",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.room.status).toBe("lobby");
    expect(r.room.players[0].nickname).toBe("민수");
    expect(r.room.hostPlayerId).toBe(r.playerId);
    expect(r.room.difficulty).toBe("medium");
  });

  it("join fails when room missing", () => {
    const r = createOrJoinRoom({
      intent: "join",
      schoolName: "없는학교",
      examHallName: "없음",
      subject: "math",
      nickname: "철수",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("ROOM_NOT_FOUND");
  });

  it("create on existing room joins and ignores difficulty", () => {
    createOrJoinRoom({
      intent: "create",
      schoolName: "A",
      examHallName: "B",
      subject: "math",
      difficulty: "easy",
      nickname: "민수",
    });
    const r2 = createOrJoinRoom({
      intent: "create",
      schoolName: "A",
      examHallName: "B",
      subject: "math",
      difficulty: "hard",
      nickname: "영희",
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.room.difficulty).toBe("easy");
    expect(r2.room.players).toHaveLength(2);
    expect(r2.room.hostPlayerId).not.toBe(r2.playerId);
  });

  it("suffixes duplicate nicknames", () => {
    createOrJoinRoom({
      intent: "create",
      schoolName: "A",
      examHallName: "B",
      subject: "korean",
      difficulty: "easy",
      nickname: "민수",
    });
    const r2 = createOrJoinRoom({
      intent: "join",
      schoolName: "A",
      examHallName: "B",
      subject: "korean",
      nickname: "민수",
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.room.players.map((p) => p.nickname).sort()).toEqual([
      "민수",
      "민수_2",
    ]);
  });

  it("rejects empty school", () => {
    const r = createOrJoinRoom({
      intent: "create",
      schoolName: "  ",
      examHallName: "B",
      subject: "math",
      nickname: "민수",
    });
    expect(r.ok).toBe(false);
  });

  it("create reclaims a full lobby stuck with ghosts", () => {
    for (let i = 0; i < 4; i++) {
      const r = createOrJoinRoom({
        intent: i === 0 ? "create" : "join",
        schoolName: "FullSchool",
        examHallName: "FullHall",
        subject: "math",
        difficulty: "easy",
        nickname: `P${i}`,
      });
      expect(r.ok).toBe(true);
    }
    const blocked = createOrJoinRoom({
      intent: "join",
      schoolName: "FullSchool",
      examHallName: "FullHall",
      subject: "math",
      nickname: "extra",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("ROOM_FULL");

    const reclaimed = createOrJoinRoom({
      intent: "create",
      schoolName: "FullSchool",
      examHallName: "FullHall",
      subject: "math",
      difficulty: "hard",
      nickname: "새호스트",
    });
    expect(reclaimed.ok).toBe(true);
    if (!reclaimed.ok) return;
    expect(reclaimed.room.players).toHaveLength(1);
    expect(reclaimed.room.players[0].nickname).toBe("새호스트");
    expect(reclaimed.room.difficulty).toBe("hard");
  });
});
