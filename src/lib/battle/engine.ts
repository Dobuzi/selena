import {
  INITIAL_HP,
  QUESTION_COUNT,
  REVEAL_MS,
  TIME_LIMIT_MS,
} from "@/lib/constants";
import { multiPoints } from "@/lib/battle/scoring";
import { applySoloOutcome, finalSoloResult } from "@/lib/battle/solo";
import { roomStore } from "@/lib/room-store";
import type { Answer, Question, Room } from "@/lib/types";

export type EngineResult =
  | { ok: true; room: Room }
  | { ok: false; code: string; message: string };

function connectedCount(room: Room): number {
  return room.players.filter((p) => p.connected).length;
}

function activePlayers(room: Room) {
  return room.players.filter((p) => p.activeInRound && p.connected);
}

function currentQuestion(room: Room): Question | null {
  if (
    room.currentQuestionIndex < 0 ||
    room.currentQuestionIndex >= room.questions.length
  ) {
    return null;
  }
  return room.questions[room.currentQuestionIndex];
}

function hasAnswered(room: Room, playerId: string, questionId: string): boolean {
  const p = room.players.find((x) => x.playerId === playerId);
  return !!p?.answers.some((a) => a.questionId === questionId);
}

export function beginAnswering(room: Room, now = Date.now()): void {
  room.battlePhase = "answering";
  room.questionDeadlineAt = now + TIME_LIMIT_MS;
  room.revealUntilAt = null;
}

export function beginReveal(room: Room, now = Date.now()): void {
  room.battlePhase = "reveal";
  room.revealUntilAt = now + REVEAL_MS;
}

export function prepareStart(
  room: Room,
  hostPlayerId: string,
): EngineResult {
  if (room.hostPlayerId !== hostPlayerId) {
    return { ok: false, code: "NOT_HOST", message: "호스트만 시작할 수 있어요." };
  }
  if (room.status !== "lobby") {
    return { ok: false, code: "BAD_STATUS", message: "대기실에서만 시작할 수 있어요." };
  }
  const n = connectedCount(room);
  if (n < 1) {
    return { ok: false, code: "NO_PLAYERS", message: "플레이어가 없어요." };
  }
  if (n === 1) {
    room.mode = "solo";
  } else if (n <= 4) {
    room.mode = "multi";
  } else {
    return { ok: false, code: "TOO_MANY", message: "최대 4명까지예요." };
  }

  for (const p of room.players) {
    p.activeInRound = p.connected;
    p.hp = INITIAL_HP;
    p.score = 0;
    p.answers = [];
  }
  room.aiHp = INITIAL_HP;
  room.soloResult = null;
  room.currentQuestionIndex = 0;
  room.questions = [];
  room.usedFallback = false;
  room.battlePhase = null;
  room.questionDeadlineAt = null;
  room.revealUntilAt = null;
  room.status = "generating";
  return { ok: true, room };
}

export function enterBattling(
  room: Room,
  questions: Question[],
  usedFallback: boolean,
  now = Date.now(),
): EngineResult {
  if (questions.length === 0) {
    return { ok: false, code: "NO_QUESTIONS", message: "문제가 없어요." };
  }
  room.questions = questions.slice(0, QUESTION_COUNT);
  room.usedFallback = usedFallback;
  room.status = "battling";
  room.currentQuestionIndex = 0;
  beginAnswering(room, now);
  return { ok: true, room };
}

function finishSolo(room: Room, result: NonNullable<Room["soloResult"]>): void {
  room.status = "finished";
  room.battlePhase = null;
  room.questionDeadlineAt = null;
  room.revealUntilAt = null;
  room.soloResult = result;
}

function finishMulti(room: Room): void {
  room.status = "finished";
  room.battlePhase = null;
  room.questionDeadlineAt = null;
  room.revealUntilAt = null;
}

function resolveCurrentQuestion(room: Room, now = Date.now()): void {
  if (room.status !== "battling" || room.battlePhase !== "answering") return;
  const q = currentQuestion(room);
  if (!q) return;

  const deadline = room.questionDeadlineAt ?? now;
  const remainingSeconds = Math.max(0, (deadline - now) / 1000);

  if (room.mode === "solo") {
    const player = room.players.find((p) => p.activeInRound);
    if (!player) return;
    let answer = player.answers.find((a) => a.questionId === q.id);
    if (!answer) {
      answer = {
        questionId: q.id,
        choiceIndex: null,
        correct: false,
        points: 0,
        answeredAt: now,
      };
      player.answers.push(answer);
    }
    const outcome = applySoloOutcome({
      playerHp: player.hp,
      aiHp: room.aiHp,
      correct: answer.correct,
    });
    player.hp = outcome.playerHp;
    room.aiHp = outcome.aiHp;
    if (outcome.finished && outcome.result) {
      finishSolo(room, outcome.result);
      return;
    }
    beginReveal(room, now);
    return;
  }

  // multi
  for (const p of activePlayers(room)) {
    if (!hasAnswered(room, p.playerId, q.id)) {
      const ans: Answer = {
        questionId: q.id,
        choiceIndex: null,
        correct: false,
        points: 0,
        answeredAt: now,
      };
      p.answers.push(ans);
    }
  }
  // recompute points for those who answered during answering with correct remaining
  for (const p of room.players.filter((x) => x.activeInRound)) {
    const ans = p.answers.find((a) => a.questionId === q.id);
    if (!ans) continue;
    if (ans.choiceIndex === null) {
      ans.correct = false;
      ans.points = 0;
    } else {
      ans.correct = ans.choiceIndex === q.correctIndex;
      // remaining was computed at submit time into points if we set then; recalculate from answeredAt
      const rem = Math.max(0, (deadline - ans.answeredAt) / 1000);
      ans.points = multiPoints(ans.correct, rem);
    }
    // score is sum of points for this round
  }
  for (const p of room.players.filter((x) => x.activeInRound)) {
    p.score = p.answers.reduce((s, a) => s + a.points, 0);
  }

  if (activePlayers(room).length === 0) {
    finishMulti(room);
    return;
  }
  beginReveal(room, now);
}

function allActiveAnswered(room: Room): boolean {
  const q = currentQuestion(room);
  if (!q) return false;
  const actives = room.players.filter((p) => p.activeInRound);
  if (actives.length === 0) return true;
  return actives.every((p) => hasAnswered(room, p.playerId, q.id));
}

export function submitAnswer(
  room: Room,
  playerId: string,
  choiceIndex: number | null,
  now = Date.now(),
): EngineResult {
  if (room.status !== "battling") {
    return { ok: false, code: "NOT_BATTLING", message: "배틀 중이 아니에요." };
  }
  if (room.battlePhase !== "answering") {
    return { ok: false, code: "NOT_ANSWERING", message: "지금은 답을 고를 수 없어요." };
  }
  const player = room.players.find((p) => p.playerId === playerId);
  if (!player || !player.activeInRound) {
    return { ok: false, code: "NOT_ACTIVE", message: "이번 판에는 참여하지 않아요." };
  }
  const q = currentQuestion(room);
  if (!q) {
    return { ok: false, code: "NO_QUESTION", message: "문제가 없어요." };
  }
  if (hasAnswered(room, playerId, q.id)) {
    return { ok: false, code: "ALREADY", message: "이미 제출했어요." };
  }
  if (
    choiceIndex !== null &&
    (choiceIndex < 0 || choiceIndex > 3 || !Number.isInteger(choiceIndex))
  ) {
    return { ok: false, code: "BAD_CHOICE", message: "보기 번호가 이상해요." };
  }

  const correct = choiceIndex !== null && choiceIndex === q.correctIndex;
  const deadline = room.questionDeadlineAt ?? now;
  const remainingSeconds = Math.max(0, (deadline - now) / 1000);
  const points =
    room.mode === "multi" ? multiPoints(correct, remainingSeconds) : 0;

  player.answers.push({
    questionId: q.id,
    choiceIndex,
    correct,
    points,
    answeredAt: now,
  });

  if (room.mode === "solo") {
    resolveCurrentQuestion(room, now);
  } else if (allActiveAnswered(room)) {
    resolveCurrentQuestion(room, now);
  }

  roomStore.set(room);
  return { ok: true, room };
}

export function ensureRoomDeadline(roomId: string, now = Date.now()): void {
  const room = roomStore.get(roomId);
  if (!room) return;
  if (room.status !== "battling" || room.battlePhase !== "answering") return;
  if (!room.questionDeadlineAt) return;
  if (now < room.questionDeadlineAt) return;
  resolveCurrentQuestion(room, now);
  roomStore.set(room);
}

export function advanceAfterReveal(roomId: string, now = Date.now()): void {
  const room = roomStore.get(roomId);
  if (!room) return;
  if (room.status !== "battling" || room.battlePhase !== "reveal") return;
  if (room.revealUntilAt && now < room.revealUntilAt) return;

  const next = room.currentQuestionIndex + 1;
  if (next >= room.questions.length) {
    if (room.mode === "solo") {
      const player = room.players.find((p) => p.activeInRound);
      finishSolo(
        room,
        finalSoloResult(player?.hp ?? 0, room.aiHp) ?? "draw",
      );
    } else {
      finishMulti(room);
    }
    roomStore.set(room);
    return;
  }

  room.currentQuestionIndex = next;
  beginAnswering(room, now);
  roomStore.set(room);
}

export function rematchRoom(room: Room, hostPlayerId: string): EngineResult {
  if (room.hostPlayerId !== hostPlayerId) {
    return { ok: false, code: "NOT_HOST", message: "호스트만 다시 할 수 있어요." };
  }
  if (room.status !== "finished") {
    return { ok: false, code: "BAD_STATUS", message: "끝난 뒤에만 다시 할 수 있어요." };
  }
  room.status = "lobby";
  room.mode = null;
  room.questions = [];
  room.currentQuestionIndex = 0;
  room.questionDeadlineAt = null;
  room.battlePhase = null;
  room.revealUntilAt = null;
  room.usedFallback = false;
  room.aiHp = INITIAL_HP;
  room.soloResult = null;
  for (const p of room.players) {
    p.activeInRound = false;
    p.hp = INITIAL_HP;
    p.score = 0;
    p.answers = [];
  }
  return { ok: true, room };
}
