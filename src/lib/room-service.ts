import { randomUUID } from "crypto";
import {
  INITIAL_HP,
  MAX_PLAYERS,
} from "@/lib/constants";
import {
  enterBattling,
  prepareStart,
  rematchRoom,
  submitAnswer,
  type EngineResult,
} from "@/lib/battle/engine";
import {
  clearRoomTimers,
  scheduleQuestionTimeout,
  scheduleRevealAdvance,
} from "@/lib/battle/timers";
import { uniqueNickname } from "@/lib/nickname";
import { generateQuestions } from "@/lib/questions/generate";
import { getFallbackQuestions } from "@/lib/questions/fallback";
import { publishRoom } from "@/lib/room-events";
import { makeRoomId } from "@/lib/room-id";
import { roomStore } from "@/lib/room-store";
import type {
  Difficulty,
  JoinIntent,
  Player,
  Room,
  Subject,
} from "@/lib/types";

export type JoinInput = {
  intent: JoinIntent;
  schoolName: string;
  examHallName: string;
  subject: Subject;
  difficulty?: Difficulty;
  nickname: string;
};

export type JoinResult =
  | { ok: true; room: Room; playerId: string }
  | { ok: false; code: string; message: string };

function emptyPlayer(nickname: string): Player {
  return {
    playerId: randomUUID(),
    nickname,
    hp: INITIAL_HP,
    score: 0,
    connected: true,
    activeInRound: false,
    joinedAt: Date.now(),
    answers: [],
  };
}

function newRoom(
  roomId: string,
  schoolName: string,
  examHallName: string,
  subject: Subject,
  difficulty: Difficulty,
  host: Player,
): Room {
  return {
    roomId,
    schoolName: schoolName.trim(),
    examHallName: examHallName.trim(),
    subject,
    difficulty,
    hostPlayerId: host.playerId,
    players: [host],
    questions: [],
    status: "lobby",
    mode: null,
    currentQuestionIndex: 0,
    questionDeadlineAt: null,
    battlePhase: null,
    revealUntilAt: null,
    usedFallback: false,
    aiHp: INITIAL_HP,
    soloResult: null,
  };
}

function joinExisting(room: Room, nickname: string): JoinResult {
  const connected = room.players.filter((p) => p.connected).length;
  if (connected >= MAX_PLAYERS) {
    return {
      ok: false,
      code: "ROOM_FULL",
      message: "시험장이 가득 찼어요 (최대 4명).",
    };
  }
  const nick = uniqueNickname(
    nickname,
    room.players.map((p) => p.nickname),
  );
  const player = emptyPlayer(nick);
  room.players.push(player);
  roomStore.set(room);
  publishRoom(room.roomId);
  return { ok: true, room, playerId: player.playerId };
}

export function createOrJoinRoom(input: JoinInput): JoinResult {
  const school = input.schoolName?.trim() ?? "";
  const hall = input.examHallName?.trim() ?? "";
  if (!school || !hall) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "학교 이름과 시험장 이름을 입력해 주세요.",
    };
  }
  const subjects: Subject[] = ["korean", "english", "math", "science"];
  if (!subjects.includes(input.subject)) {
    return { ok: false, code: "VALIDATION", message: "과목을 확인해 주세요." };
  }

  const roomId = makeRoomId(school, hall, input.subject);
  const existing = roomStore.get(roomId);

  if (input.intent === "join") {
    if (!existing) {
      return {
        ok: false,
        code: "ROOM_NOT_FOUND",
        message: "시험장이 없어요. 만들기를 눌러 주세요.",
      };
    }
    return joinExisting(existing, input.nickname);
  }

  // create
  if (existing) {
    return joinExisting(existing, input.nickname);
  }

  const difficulty = input.difficulty ?? "medium";
  const host = emptyPlayer(uniqueNickname(input.nickname, []));
  const room = newRoom(roomId, school, hall, input.subject, difficulty, host);
  roomStore.set(room);
  publishRoom(room.roomId);
  return { ok: true, room, playerId: host.playerId };
}

function afterMutation(room: Room): void {
  roomStore.set(room);
  if (room.status === "battling" && room.battlePhase === "answering") {
    scheduleQuestionTimeout(room.roomId);
  } else if (room.status === "battling" && room.battlePhase === "reveal") {
    scheduleRevealAdvance(room.roomId);
  } else if (room.status === "finished" || room.status === "lobby") {
    clearRoomTimers(room.roomId);
  }
  publishRoom(room.roomId);
}

export async function startRoom(
  roomId: string,
  playerId: string,
): Promise<EngineResult> {
  const room = roomStore.get(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  const prep = prepareStart(room, playerId);
  if (!prep.ok) return prep;
  roomStore.set(room);
  publishRoom(room.roomId);

  let questions;
  let usedFallback = false;
  try {
    const gen = await generateQuestions({
      subject: room.subject,
      difficulty: room.difficulty,
    });
    questions = gen.questions;
    usedFallback = gen.usedFallback;
  } catch {
    questions = getFallbackQuestions(room.subject, room.difficulty);
    usedFallback = true;
  }

  const battle = enterBattling(room, questions, usedFallback);
  if (!battle.ok) return battle;
  afterMutation(room);
  return { ok: true, room };
}

export function answerRoom(
  roomId: string,
  playerId: string,
  choiceIndex: number | null,
): EngineResult {
  const room = roomStore.get(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  const result = submitAnswer(room, playerId, choiceIndex);
  if (!result.ok) return result;
  afterMutation(room);
  return result;
}

export function rematch(roomId: string, playerId: string): EngineResult {
  const room = roomStore.get(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  const result = rematchRoom(room, playerId);
  if (!result.ok) return result;
  clearRoomTimers(roomId);
  afterMutation(room);
  return result;
}

export function leaveRoom(roomId: string, playerId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;
  const player = room.players.find((p) => p.playerId === playerId);
  if (!player) return;

  player.connected = false;
  if (player.activeInRound && room.status === "battling") {
    player.activeInRound = false;
  }

  const remaining = room.players.filter((p) => p.connected);
  if (remaining.length === 0) {
    clearRoomTimers(roomId);
    roomStore.delete(roomId);
    publishRoom(roomId);
    return;
  }

  if (room.hostPlayerId === playerId) {
    remaining.sort((a, b) => a.joinedAt - b.joinedAt);
    room.hostPlayerId = remaining[0].playerId;
  }

  if (
    room.status === "battling" &&
    room.mode === "multi" &&
    room.players.filter((p) => p.activeInRound && p.connected).length === 0
  ) {
    room.status = "finished";
    room.battlePhase = null;
    room.questionDeadlineAt = null;
    room.revealUntilAt = null;
    clearRoomTimers(roomId);
  }

  roomStore.set(room);
  publishRoom(roomId);
}

export function reconnectPlayer(
  roomId: string,
  playerId: string,
): JoinResult {
  const room = roomStore.get(roomId);
  if (!room) {
    return {
      ok: false,
      code: "ROOM_NOT_FOUND",
      message: "시험장이 없어요.",
    };
  }
  const player = room.players.find((p) => p.playerId === playerId);
  if (!player) {
    return {
      ok: false,
      code: "PLAYER_NOT_FOUND",
      message: "플레이어를 찾을 수 없어요.",
    };
  }
  player.connected = true;
  roomStore.set(room);
  publishRoom(roomId);
  return { ok: true, room, playerId };
}

export function getRoom(roomId: string): Room | undefined {
  return roomStore.get(roomId);
}
