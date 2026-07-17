import { describe, it, expect, beforeEach } from "vitest";
import { roomStore } from "@/lib/room-store";
import { createOrJoinRoom } from "@/lib/room-service";
import {
  enterBattling,
  prepareStart,
  submitAnswer,
  ensureRoomDeadline,
  advanceAfterReveal,
} from "@/lib/battle/engine";
import { getFallbackQuestions } from "@/lib/questions/fallback";
import { TIME_LIMIT_MS, REVEAL_MS } from "@/lib/constants";
import { toClientView } from "@/lib/room-view";

beforeEach(() => roomStore.clear());

function setupSolo() {
  const r = createOrJoinRoom({
    intent: "create",
    schoolName: "S",
    examHallName: "H",
    subject: "math",
    difficulty: "easy",
    nickname: "민수",
  });
  if (!r.ok) throw new Error("fail");
  prepareStart(r.room, r.playerId);
  enterBattling(r.room, getFallbackQuestions("math", "easy"), true);
  roomStore.set(r.room);
  return r;
}

describe("battle engine solo", () => {
  it("reduces aiHp on correct and reveals", () => {
    const { room, playerId } = setupSolo();
    const q = room.questions[0];
    submitAnswer(room, playerId, q.correctIndex);
    expect(room.aiHp).toBe(2);
    expect(room.battlePhase).toBe("reveal");
    const view = toClientView(room);
    expect(view.currentQuestion?.correctIndex).toBe(q.correctIndex);
  });

  it("finishes with lose when player hp hits 0", () => {
    const { room, playerId } = setupSolo();
    const player = room.players[0];
    player.hp = 1;
    submitAnswer(room, playerId, (room.questions[0].correctIndex + 1) % 4);
    expect(room.status).toBe("finished");
    expect(room.soloResult).toBe("lose");
  });

  it("timeout path marks wrong", () => {
    const { room } = setupSolo();
    const now = (room.questionDeadlineAt ?? Date.now()) + 1;
    ensureRoomDeadline(room, now);
    expect(room.players[0].hp).toBe(2);
    expect(room.battlePhase).toBe("reveal");
  });
});

describe("battle engine multi", () => {
  it("scores correct answers and freezes inactive", () => {
    const a = createOrJoinRoom({
      intent: "create",
      schoolName: "M",
      examHallName: "1",
      subject: "science",
      difficulty: "easy",
      nickname: "A",
    });
    const b = createOrJoinRoom({
      intent: "join",
      schoolName: "M",
      examHallName: "1",
      subject: "science",
      nickname: "B",
    });
    if (!a.ok || !b.ok) throw new Error("join fail");
    prepareStart(a.room, a.playerId);
    enterBattling(a.room, getFallbackQuestions("science", "medium"), true);
    roomStore.set(a.room);

    const waiter = createOrJoinRoom({
      intent: "join",
      schoolName: "M",
      examHallName: "1",
      subject: "science",
      nickname: "C",
    });
    if (!waiter.ok) throw new Error("waiter");
    expect(waiter.room.players.find((p) => p.playerId === waiter.playerId)?.activeInRound).toBe(
      false,
    );

    const q = a.room.questions[0];
    const now = Date.now();
    a.room.questionDeadlineAt = now + TIME_LIMIT_MS;
    submitAnswer(a.room, a.playerId, q.correctIndex, now);
    submitAnswer(a.room, b.playerId, q.correctIndex, now);
    expect(a.room.battlePhase).toBe("reveal");
    const host = a.room.players.find((p) => p.playerId === a.playerId)!;
    expect(host.score).toBeGreaterThanOrEqual(100);

    const bad = submitAnswer(a.room, waiter.playerId, 0, now);
    expect(bad.ok).toBe(false);
  });

  it("advances after reveal", () => {
    const { room, playerId } = setupSolo();
    submitAnswer(room, playerId, room.questions[0].correctIndex);
    const t = (room.revealUntilAt ?? Date.now()) + 1;
    advanceAfterReveal(room, t);
    expect(room.currentQuestionIndex).toBe(1);
    expect(room.battlePhase).toBe("answering");
  });
});

// silence unused
void REVEAL_MS;
