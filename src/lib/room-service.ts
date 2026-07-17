import { randomUUID } from "crypto";
import {
  INITIAL_HP,
  MAX_PLAYERS,
  PLAYER_STALE_MS,
  AI_GENERATE_TIMEOUT_MS,
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
  const now = Date.now();
  return {
    playerId: randomUUID(),
    nickname,
    hp: INITIAL_HP,
    score: 0,
    connected: true,
    activeInRound: false,
    joinedAt: now,
    lastSeenAt: now,
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

/** Remove disconnected + heartbeat-stale players. Delete empty rooms. */
export function pruneRoom(roomId: string, now = Date.now()): Room | undefined {
  const room = roomStore.get(roomId);
  if (!room) return undefined;

  const before = room.players.length;
  room.players = room.players.filter((p) => {
    if (!p.connected) return false;
    const last = p.lastSeenAt ?? p.joinedAt;
    return now - last <= PLAYER_STALE_MS;
  });

  if (room.players.length === 0) {
    clearRoomTimers(roomId);
    roomStore.delete(roomId);
    if (before > 0) publishRoom(roomId);
    return undefined;
  }

  if (!room.players.some((p) => p.playerId === room.hostPlayerId)) {
    room.players.sort((a, b) => a.joinedAt - b.joinedAt);
    room.hostPlayerId = room.players[0].playerId;
  }

  roomStore.set(room);
  return room;
}

export function touchRoomActivity(roomId: string, playerId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;
  const p = room.players.find((x) => x.playerId === playerId);
  if (!p) return;
  p.connected = true;
  p.lastSeenAt = Date.now();
  roomStore.set(room);
}

function liveCount(room: Room): number {
  return room.players.filter((p) => p.connected).length;
}

function joinExisting(room: Room, nickname: string): JoinResult {
  const pruned = pruneRoom(room.roomId);
  if (!pruned) {
    return {
      ok: false,
      code: "ROOM_NOT_FOUND",
      message: "시험장이 없어요. 만들기를 눌러 주세요.",
    };
  }

  if (liveCount(pruned) >= MAX_PLAYERS) {
    return {
      ok: false,
      code: "ROOM_FULL",
      message: `시험장이 가득 찼어요 (최대 ${MAX_PLAYERS}명). 잠시 후 다시 시도하거나 다른 시험장 이름을 써 주세요.`,
    };
  }

  const nick = uniqueNickname(
    nickname,
    pruned.players.map((p) => p.nickname),
  );
  const player = emptyPlayer(nick);
  pruned.players.push(player);
  roomStore.set(pruned);
  publishRoom(pruned.roomId);
  return { ok: true, room: pruned, playerId: player.playerId };
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
  if (!input.nickname?.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "닉네임을 입력해 주세요.",
    };
  }
  const subjects: Subject[] = ["korean", "english", "math", "science"];
  if (!subjects.includes(input.subject)) {
    return { ok: false, code: "VALIDATION", message: "과목을 확인해 주세요." };
  }

  const roomId = makeRoomId(school, hall, input.subject);
  // Always prune first so ghost slots free up
  let existing = pruneRoom(roomId);

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

  const difficulty = input.difficulty ?? "medium";

  // create: empty after prune → brand new room
  if (!existing) {
    const host = emptyPlayer(uniqueNickname(input.nickname, []));
    const room = newRoom(roomId, school, hall, input.subject, difficulty, host);
    roomStore.set(room);
    publishRoom(room.roomId);
    return { ok: true, room, playerId: host.playerId };
  }

  // create when room is stuck full (ghosts): reclaim lobby
  if (liveCount(existing) >= MAX_PLAYERS) {
    if (existing.status === "lobby" || existing.status === "finished") {
      clearRoomTimers(roomId);
      roomStore.delete(roomId);
      const host = emptyPlayer(uniqueNickname(input.nickname, []));
      const room = newRoom(roomId, school, hall, input.subject, difficulty, host);
      roomStore.set(room);
      publishRoom(room.roomId);
      return { ok: true, room, playerId: host.playerId };
    }
    return {
      ok: false,
      code: "ROOM_FULL",
      message: `시험장이 가득 찼어요 (최대 ${MAX_PLAYERS}명). 다른 시험장 이름을 쓰거나 잠시 후 다시 시도해 주세요.`,
    };
  }

  // create on existing open room: join (keep existing difficulty)
  return joinExisting(existing, input.nickname);
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

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function startRoom(
  roomId: string,
  playerId: string,
): Promise<EngineResult> {
  const room = pruneRoom(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  touchRoomActivity(roomId, playerId);

  const prep = prepareStart(room, playerId);
  if (!prep.ok) return prep;
  roomStore.set(room);
  publishRoom(room.roomId);

  let questions;
  let usedFallback = false;
  try {
    const gen = await withTimeout(
      generateQuestions({
        subject: room.subject,
        difficulty: room.difficulty,
      }),
      AI_GENERATE_TIMEOUT_MS,
    );
    questions = gen.questions;
    usedFallback = gen.usedFallback;
  } catch {
    questions = getFallbackQuestions(room.subject, room.difficulty);
    usedFallback = true;
  }

  // Room may have been mutated; re-get
  const live = roomStore.get(roomId);
  if (!live || live.status !== "generating") {
    // still apply questions if still generating
  }
  const target = roomStore.get(roomId) ?? room;
  const battle = enterBattling(target, questions, usedFallback);
  if (!battle.ok) return battle;
  afterMutation(target);
  return { ok: true, room: target };
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
  touchRoomActivity(roomId, playerId);
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
  touchRoomActivity(roomId, playerId);
  const result = rematchRoom(room, playerId);
  if (!result.ok) return result;
  clearRoomTimers(roomId);
  afterMutation(room);
  return result;
}

export function leaveRoom(roomId: string, playerId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;
  const idx = room.players.findIndex((p) => p.playerId === playerId);
  if (idx < 0) return;

  const wasActive = room.players[idx].activeInRound;
  // Fully remove player so slots free immediately
  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    clearRoomTimers(roomId);
    roomStore.delete(roomId);
    publishRoom(roomId);
    return;
  }

  if (room.hostPlayerId === playerId) {
    room.players.sort((a, b) => a.joinedAt - b.joinedAt);
    room.hostPlayerId = room.players[0].playerId;
  }

  if (
    room.status === "battling" &&
    room.mode === "multi" &&
    wasActive &&
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
  const room = pruneRoom(roomId);
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
      message: "세션이 만료됐어요. 홈에서 다시 입장해 주세요.",
    };
  }
  player.connected = true;
  player.lastSeenAt = Date.now();
  roomStore.set(room);
  publishRoom(roomId);
  return { ok: true, room, playerId };
}

export function getRoom(roomId: string): Room | undefined {
  return pruneRoom(roomId) ?? roomStore.get(roomId);
}

/** Debug / recovery: wipe a room by id */
export function forceDeleteRoom(roomId: string): void {
  clearRoomTimers(roomId);
  roomStore.delete(roomId);
  publishRoom(roomId);
}

export function forceClearAllRooms(): void {
  roomStore.clear();
}
