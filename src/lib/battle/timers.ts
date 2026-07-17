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
    ensureRoomDeadline(roomId);
    const r = roomStore.get(roomId);
    if (r?.battlePhase === "reveal") {
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
    advanceAfterReveal(roomId);
    const r = roomStore.get(roomId);
    if (r?.status === "battling" && r.battlePhase === "answering") {
      scheduleQuestionTimeout(roomId);
    }
    publishRoom(roomId);
  }, delay);
  handles.set(roomId, h);
}

export function tickRoom(roomId: string): void {
  ensureRoomDeadline(roomId);
  const afterDeadline = roomStore.get(roomId);
  if (afterDeadline?.battlePhase === "reveal") {
    scheduleRevealAdvance(roomId);
  }
  advanceAfterReveal(roomId);
  const afterReveal = roomStore.get(roomId);
  if (afterReveal?.status === "battling" && afterReveal.battlePhase === "answering") {
    scheduleQuestionTimeout(roomId);
  }
}

// re-export constants used by tests if needed
export { TIME_LIMIT_MS, REVEAL_MS };
