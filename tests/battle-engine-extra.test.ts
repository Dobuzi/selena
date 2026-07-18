import { describe, it, expect, beforeEach } from "vitest";
import { roomStore } from "@/lib/room-store";
import { createOrJoinRoom } from "@/lib/room-service";
import {
  enterBattling,
  prepareStart,
  submitAnswer,
  rematchRoom,
  advanceAfterReveal,
} from "@/lib/battle/engine";
import { getFallbackQuestions } from "@/lib/questions/fallback";
import { toClientView } from "@/lib/room-view";
import { finalSoloResult } from "@/lib/battle/solo";

beforeEach(() => roomStore.clear());

describe("battle engine extras", () => {
  it("rejects non-host start", () => {
    const a = createOrJoinRoom({
      intent: "create",
      schoolName: "X",
      examHallName: "1",
      subject: "math",
      nickname: "A",
    });
    const b = createOrJoinRoom({
      intent: "join",
      schoolName: "X",
      examHallName: "1",
      subject: "math",
      nickname: "B",
    });
    if (!a.ok || !b.ok) throw new Error("setup");
    const bad = prepareStart(a.room, b.playerId);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe("NOT_HOST");
  });

  it("solo immediate win when aiHp hits 0", () => {
    const r = createOrJoinRoom({
      intent: "create",
      schoolName: "W",
      examHallName: "1",
      subject: "math",
      nickname: "N",
    });
    if (!r.ok) throw new Error("create");
    prepareStart(r.room, r.playerId);
    enterBattling(r.room, getFallbackQuestions("math", "easy"), true);
    r.room.aiHp = 1;
    const q = r.room.questions[0];
    submitAnswer(r.room, r.playerId, q.correctIndex);
    expect(r.room.status).toBe("finished");
    expect(r.room.soloResult).toBe("win");
  });

  it("double submit rejected", () => {
    const r = createOrJoinRoom({
      intent: "create",
      schoolName: "D",
      examHallName: "1",
      subject: "math",
      nickname: "N",
    });
    if (!r.ok) throw new Error("create");
    prepareStart(r.room, r.playerId);
    enterBattling(r.room, getFallbackQuestions("math", "easy"), true);
    // Use multi-like path: two players so solo doesn't finish on first resolve differently
    // Solo: first answer goes to reveal immediately
    const q = r.room.questions[0];
    const first = submitAnswer(r.room, r.playerId, q.correctIndex);
    expect(first.ok).toBe(true);
    const second = submitAnswer(r.room, r.playerId, 0);
    expect(second.ok).toBe(false);
  });

  it("rematchRoom resets fields", () => {
    const r = createOrJoinRoom({
      intent: "create",
      schoolName: "Rm",
      examHallName: "1",
      subject: "math",
      nickname: "N",
    });
    if (!r.ok) throw new Error("create");
    prepareStart(r.room, r.playerId);
    enterBattling(r.room, getFallbackQuestions("math", "easy"), true);
    r.room.status = "finished";
    r.room.soloResult = "win";
    const out = rematchRoom(r.room, r.playerId);
    expect(out.ok).toBe(true);
    expect(r.room.status).toBe("lobby");
    expect(r.room.mode).toBeNull();
    expect(r.room.questions).toHaveLength(0);
    expect(r.room.soloResult).toBeNull();
    expect(r.room.players[0].activeInRound).toBe(false);
  });

  it("finalSoloResult ordering", () => {
    expect(finalSoloResult(3, 1)).toBe("win");
    expect(finalSoloResult(1, 3)).toBe("lose");
    expect(finalSoloResult(2, 2)).toBe("draw");
  });

  it("client view never leaks answer key mid multi answering", () => {
    const a = createOrJoinRoom({
      intent: "create",
      schoolName: "Leak",
      examHallName: "1",
      subject: "math",
      nickname: "A",
    });
    const b = createOrJoinRoom({
      intent: "join",
      schoolName: "Leak",
      examHallName: "1",
      subject: "math",
      nickname: "B",
    });
    if (!a.ok || !b.ok) throw new Error("setup");
    prepareStart(a.room, a.playerId);
    enterBattling(a.room, getFallbackQuestions("math", "easy"), true);
    const view = toClientView(a.room);
    expect(view.battlePhase).toBe("answering");
    expect(view.currentQuestion?.correctIndex).toBeUndefined();

    submitAnswer(a.room, a.playerId, 0);
    const mid = toClientView(a.room);
    // still answering until B submits
    if (mid.battlePhase === "answering") {
      expect(mid.currentQuestion?.correctIndex).toBeUndefined();
    }

    submitAnswer(a.room, b.playerId, 1);
    advanceAfterReveal(a.room, (a.room.revealUntilAt ?? Date.now()) + 1);
    // after advance to next question, still no leak on new answering
    if (a.room.status === "battling" && a.room.battlePhase === "answering") {
      expect(toClientView(a.room).currentQuestion?.correctIndex).toBeUndefined();
    }
  });
});
