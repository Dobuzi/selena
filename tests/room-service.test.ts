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
});
