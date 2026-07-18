/**
 * Client-side room service for GitHub Pages static export.
 * Solo works fully; multi works across tabs (same browser) via localStorage + BroadcastChannel.
 */
import {
  INITIAL_HP,
  MAX_PLAYERS,
  QUESTION_COUNT,
  TIME_LIMIT_MS,
} from "@/lib/constants";
import {
  advanceAfterReveal,
  enterBattling,
  ensureRoomDeadline,
  prepareStart,
  rematchRoom,
  submitAnswer,
} from "@/lib/battle/engine";
import { uniqueNickname } from "@/lib/nickname";
import { getFallbackQuestions } from "@/lib/questions/fallback";
import { makeRoomId } from "@/lib/room-id";
import { toClientView, type ClientRoom } from "@/lib/room-view";
import type {
  Difficulty,
  JoinIntent,
  Player,
  Room,
  Subject,
} from "@/lib/types";

const STORAGE_KEY = "selena:browser-rooms:v1";
const CHANNEL = "selena-rooms";

type ApiResult =
  | { ok: true; room: ClientRoom; playerId: string }
  | { ok: false; code: string; message: string };

const memory = new Map<string, Room>();
const timerHandles = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<(roomId: string) => void>();
let hydrated = false;

function loadAll(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Room>;
    memory.clear();
    for (const [id, room] of Object.entries(obj)) {
      memory.set(id, room);
    }
  } catch {
    /* ignore */
  }
}

/** Skip applying our own BroadcastChannel echo (prevents loadAll races). */
let suppressBroadcastApply = false;

function persist(): void {
  if (typeof window === "undefined") return;
  const obj: Record<string, Room> = {};
  for (const [id, room] of memory) obj[id] = room;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* quota */
  }
  try {
    suppressBroadcastApply = true;
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: "sync" });
    bc.close();
    // Other tabs receive async; clear suppress on next macrotask so we
    // ignore our own echo without blocking real cross-tab updates.
    setTimeout(() => {
      suppressBroadcastApply = false;
    }, 0);
  } catch {
    suppressBroadcastApply = false;
  }
}

function ensure(): void {
  if (hydrated) return;
  hydrated = true;
  loadAll();
  if (typeof window === "undefined") return;
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = () => {
      if (suppressBroadcastApply) return;
      loadAll();
      for (const id of memory.keys()) notify(id);
    };
  } catch {
    /* ignore */
  }
}

function notify(roomId: string): void {
  for (const l of listeners) l(roomId);
}

export function subscribeBrowserRoom(fn: (roomId: string) => void): () => void {
  ensure();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emptyPlayer(nickname: string): Player {
  const now = Date.now();
  return {
    playerId: crypto.randomUUID(),
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

function clearTimers(roomId: string): void {
  const h = timerHandles.get(roomId);
  if (h) clearTimeout(h);
  timerHandles.delete(roomId);
}

function save(room: Room, opts?: { notifyListeners?: boolean }): void {
  memory.set(room.roomId, room);
  persist();
  // Default: notify other UI subscribers. Callers that are themselves
  // reacting to a read (browserGetRoom) must pass notifyListeners:false
  // or fetchRoom → getRoom → save → notify → fetchRoom loops forever.
  if (opts?.notifyListeners !== false) {
    notify(room.roomId);
  }
}

function tick(room: Room): void {
  ensureRoomDeadline(room);
  advanceAfterReveal(room);
}

function scheduleRoom(roomId: string): void {
  clearTimers(roomId);
  const room = memory.get(roomId);
  if (!room || room.status !== "battling") return;

  if (room.battlePhase === "answering" && room.questionDeadlineAt) {
    const delay = Math.max(0, room.questionDeadlineAt - Date.now()) + 40;
    timerHandles.set(
      roomId,
      setTimeout(() => {
        const r = memory.get(roomId);
        if (!r) return;
        tick(r);
        save(r);
        scheduleRoom(roomId);
      }, delay),
    );
  } else if (room.battlePhase === "reveal" && room.revealUntilAt) {
    const delay = Math.max(0, room.revealUntilAt - Date.now()) + 40;
    timerHandles.set(
      roomId,
      setTimeout(() => {
        const r = memory.get(roomId);
        if (!r) return;
        tick(r);
        save(r);
        scheduleRoom(roomId);
      }, delay),
    );
  }
}

function getRaw(roomId: string): Room | undefined {
  ensure();
  return memory.get(roomId);
}

export function browserGetRoom(roomId: string): ClientRoom | null {
  if (!roomId) return null;
  const room = getRaw(roomId);
  if (!room) return null;
  try {
    tick(room);
    // Silent save: reading must not re-notify subscribers (infinite loop).
    save(room, { notifyListeners: false });
    scheduleRoom(roomId);
    return toClientView(room);
  } catch {
    // Corrupted room payload should not hang the UI on "loading…"
    return toClientView(room);
  }
}

export function browserCreateOrJoin(input: {
  intent: JoinIntent;
  schoolName: string;
  examHallName: string;
  subject: Subject;
  difficulty?: Difficulty;
  nickname: string;
}): ApiResult {
  ensure();
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

  const roomId = makeRoomId(school, hall, input.subject);
  let room = memory.get(roomId);

  // Pages static: rooms live only in this browser's localStorage.
  // "입장" with no room → create one so the form never dead-ends.
  if (!room) {
    if (input.intent === "join") {
      // Still create, but keep a clear product message for multi-device confusion
      const host = emptyPlayer(uniqueNickname(input.nickname, []));
      room = {
        roomId,
        schoolName: school,
        examHallName: hall,
        subject: input.subject,
        difficulty: input.difficulty ?? "medium",
        hostPlayerId: host.playerId,
        players: [host],
        questions: [],
        status: "lobby",
        mode: null,
        currentQuestionIndex: 0,
        questionDeadlineAt: null,
        battlePhase: null,
        revealUntilAt: null,
        usedFallback: true,
        aiHp: INITIAL_HP,
        soloResult: null,
      };
      save(room);
      return { ok: true, room: toClientView(room), playerId: host.playerId };
    }
    const host = emptyPlayer(uniqueNickname(input.nickname, []));
    room = {
      roomId,
      schoolName: school,
      examHallName: hall,
      subject: input.subject,
      difficulty: input.difficulty ?? "medium",
      hostPlayerId: host.playerId,
      players: [host],
      questions: [],
      status: "lobby",
      mode: null,
      currentQuestionIndex: 0,
      questionDeadlineAt: null,
      battlePhase: null,
      revealUntilAt: null,
      usedFallback: true,
      aiHp: INITIAL_HP,
      soloResult: null,
    };
    save(room);
    return { ok: true, room: toClientView(room), playerId: host.playerId };
  }

  const live = room.players.filter((p) => p.connected).length;
  if (input.intent === "create" && live >= MAX_PLAYERS) {
    if (room.status === "lobby" || room.status === "finished") {
      const host = emptyPlayer(uniqueNickname(input.nickname, []));
      room = {
        ...room,
        hostPlayerId: host.playerId,
        players: [host],
        questions: [],
        status: "lobby",
        mode: null,
        difficulty: input.difficulty ?? room.difficulty,
        currentQuestionIndex: 0,
        battlePhase: null,
        soloResult: null,
        aiHp: INITIAL_HP,
      };
      save(room);
      return { ok: true, room: toClientView(room), playerId: host.playerId };
    }
    return {
      ok: false,
      code: "ROOM_FULL",
      message: `시험장이 가득 찼어요 (최대 ${MAX_PLAYERS}명).`,
    };
  }

  if (live >= MAX_PLAYERS) {
    return {
      ok: false,
      code: "ROOM_FULL",
      message: `시험장이 가득 찼어요 (최대 ${MAX_PLAYERS}명).`,
    };
  }

  const nick = uniqueNickname(
    input.nickname,
    room.players.map((p) => p.nickname),
  );
  const player = emptyPlayer(nick);
  room.players.push(player);
  save(room);
  return { ok: true, room: toClientView(room), playerId: player.playerId };
}

export function browserStart(roomId: string, playerId: string): ApiResult {
  const room = getRaw(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  const prep = prepareStart(room, playerId);
  if (!prep.ok) {
    return { ok: false, code: prep.code, message: prep.message };
  }
  const questions = getFallbackQuestions(room.subject, room.difficulty).slice(
    0,
    QUESTION_COUNT,
  );
  const battle = enterBattling(room, questions, true);
  if (!battle.ok) {
    return { ok: false, code: battle.code, message: battle.message };
  }
  save(room);
  scheduleRoom(roomId);
  return { ok: true, room: toClientView(room), playerId };
}

export function browserAnswer(
  roomId: string,
  playerId: string,
  choiceIndex: number | null,
): ApiResult {
  const room = getRaw(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  const result = submitAnswer(room, playerId, choiceIndex);
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }
  save(room);
  scheduleRoom(roomId);
  return { ok: true, room: toClientView(room), playerId };
}

export function browserRematch(roomId: string, playerId: string): ApiResult {
  const room = getRaw(roomId);
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "시험장이 없어요." };
  }
  const result = rematchRoom(room, playerId);
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }
  clearTimers(roomId);
  save(room);
  return { ok: true, room: toClientView(room), playerId };
}

export function browserLeave(roomId: string, playerId: string): void {
  const room = getRaw(roomId);
  if (!room) return;
  const idx = room.players.findIndex((p) => p.playerId === playerId);
  if (idx < 0) return;
  room.players.splice(idx, 1);
  if (room.players.length === 0) {
    clearTimers(roomId);
    memory.delete(roomId);
    persist();
    notify(roomId);
    return;
  }
  if (room.hostPlayerId === playerId) {
    room.players.sort((a, b) => a.joinedAt - b.joinedAt);
    room.hostPlayerId = room.players[0].playerId;
  }
  save(room);
}

/** Test-only: wipe in-memory + localStorage room state. */
export function _resetBrowserRoomsForTests(): void {
  for (const id of [...timerHandles.keys()]) clearTimers(id);
  memory.clear();
  listeners.clear();
  hydrated = false;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

void TIME_LIMIT_MS;
