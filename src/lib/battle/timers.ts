import { REVEAL_MS, TIME_LIMIT_MS } from "@/lib/constants";
import { roomStore } from "@/lib/room-store";
import { publishRoom } from "@/lib/room-events";
import {
  advanceAfterReveal,
  ensureRoomDeadline,
} from "@/lib/battle/engine";

const handles = new Map<string, NodeJS.Timeout>();

function clearHandle(roomId: string): void {
  const h = handles.get(roomId);
  if (h) {
    clearTimeout(h);
    handles.delete(roomId);
  }
}

export function clearRoomTimers(roomId: string): void {
  clearHandle(roomId);
}

export function scheduleQuestionTimeout(roomId: string): void {
  clearHandle(roomId);
  const room = roomStore.get(roomId);
  if (!room || room.battlePhase !== "answering" || !room.questionDeadlineAt) {
    return;
  }
  const delay = Math.max(0, room.questionDeadlineAt - Date.now()) + 50;
  const h = setTimeout(() => {
    handles.delete(roomId);
    const r = roomStore.get(roomId);
    if (r) {
      ensureRoomDeadline(r);
      roomStore.set(r);
    }
    const next = roomStore.get(roomId);
    if (next?.battlePhase === "reveal") {
      scheduleRevealAdvance(roomId);
    }
    publishRoom(roomId);
  }, delay);
  handles.set(roomId, h);
}

export function scheduleRevealAdvance(roomId: string): void {
  clearHandle(roomId);
  const room = roomStore.get(roomId);
  if (!room || room.battlePhase !== "reveal" || !room.revealUntilAt) {
    return;
  }
  const delay = Math.max(0, room.revealUntilAt - Date.now()) + 20;
  const h = setTimeout(() => {
    handles.delete(roomId);
    const r = roomStore.get(roomId);
    if (r) {
      advanceAfterReveal(r);
      roomStore.set(r);
    }
    const next = roomStore.get(roomId);
    if (next?.status === "battling" && next.battlePhase === "answering") {
      scheduleQuestionTimeout(roomId);
    }
    publishRoom(roomId);
  }, delay);
  handles.set(roomId, h);
}

export function tickRoom(roomId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;
  ensureRoomDeadline(room);
  roomStore.set(room);
  const afterDeadline = roomStore.get(roomId);
  if (afterDeadline?.battlePhase === "reveal") {
    scheduleRevealAdvance(roomId);
  }
  const r2 = roomStore.get(roomId);
  if (r2) {
    advanceAfterReveal(r2);
    roomStore.set(r2);
  }
  const afterReveal = roomStore.get(roomId);
  if (afterReveal?.status === "battling" && afterReveal.battlePhase === "answering") {
    scheduleQuestionTimeout(roomId);
  }
}

export { TIME_LIMIT_MS, REVEAL_MS };
