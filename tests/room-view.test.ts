import { describe, it, expect } from "vitest";
import { toClientView } from "@/lib/room-view";
import type { Room } from "@/lib/types";
import { INITIAL_HP } from "@/lib/constants";

function baseRoom(over: Partial<Room> = {}): Room {
  return {
    roomId: "r1",
    schoolName: "S",
    examHallName: "H",
    subject: "math",
    difficulty: "easy",
    hostPlayerId: "p1",
    players: [
      {
        playerId: "p1",
        nickname: "나",
        hp: 3,
        score: 0,
        connected: true,
        activeInRound: true,
        joinedAt: 1,
        lastSeenAt: 1,
        answers: [],
      },
    ],
    questions: [
      {
        id: "q1",
        stem: "1+1?",
        choices: ["1", "2", "3", "4"],
        correctIndex: 1,
        explanation: "2",
      },
    ],
    status: "battling",
    mode: "solo",
    currentQuestionIndex: 0,
    questionDeadlineAt: Date.now() + 20_000,
    battlePhase: "answering",
    revealUntilAt: null,
    usedFallback: true,
    aiHp: INITIAL_HP,
    soloResult: null,
    ...over,
  };
}

describe("toClientView", () => {
  it("hides correctIndex during answering", () => {
    const view = toClientView(baseRoom({ battlePhase: "answering" }));
    expect(view.currentQuestion?.stem).toBe("1+1?");
    expect(view.currentQuestion?.correctIndex).toBeUndefined();
    expect(view.currentQuestion?.explanation).toBeUndefined();
  });

  it("reveals correctIndex and explanation in reveal phase", () => {
    const view = toClientView(baseRoom({ battlePhase: "reveal" }));
    expect(view.currentQuestion?.correctIndex).toBe(1);
    expect(view.currentQuestion?.explanation).toBe("2");
  });

  it("builds review only for played questions when finished", () => {
    const room = baseRoom({
      status: "finished",
      battlePhase: null,
      players: [
        {
          playerId: "p1",
          nickname: "나",
          hp: 2,
          score: 0,
          connected: true,
          activeInRound: true,
          joinedAt: 1,
          lastSeenAt: 1,
          answers: [
            {
              questionId: "q1",
              choiceIndex: 1,
              correct: true,
              points: 0,
              answeredAt: 1,
            },
          ],
        },
      ],
      questions: [
        {
          id: "q1",
          stem: "played",
          choices: ["a", "b", "c", "d"],
          correctIndex: 1,
          explanation: "e1",
        },
        {
          id: "q2",
          stem: "unplayed",
          choices: ["a", "b", "c", "d"],
          correctIndex: 0,
          explanation: "e2",
        },
      ],
    });
    const view = toClientView(room);
    expect(view.review).toHaveLength(1);
    expect(view.review[0].question.stem).toBe("played");
  });
});
