import type { Room } from "./types";
import {
  dbClearRooms,
  dbDeleteRoom,
  dbGetRoom,
  dbLoadAllRooms,
  dbSetRoom,
} from "./room-db";

/**
 * Hot cache + SQLite durability.
 * - set/delete always write through to SQLite
 * - get falls back to DB if not in memory (e.g. after HMR/restart)
 */
const memory = new Map<string, Room>();
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    for (const room of dbLoadAllRooms()) {
      memory.set(room.roomId, room);
    }
  } catch {
    // DB unavailable in edge edge-cases — memory-only
  }
}

export const roomStore = {
  get(id: string): Room | undefined {
    ensureHydrated();
    const cached = memory.get(id);
    if (cached) return cached;
    try {
      const fromDb = dbGetRoom(id);
      if (fromDb) {
        memory.set(id, fromDb);
        return fromDb;
      }
    } catch {
      /* ignore */
    }
    return undefined;
  },

  set(room: Room): void {
    ensureHydrated();
    // Keep the live reference in memory so in-process mutations stay consistent.
    // Persist a snapshot to SQLite for durability across restarts.
    memory.set(room.roomId, room);
    try {
      dbSetRoom(structuredClone(room) as Room);
    } catch {
      /* memory still works */
    }
  },

  delete(id: string): void {
    ensureHydrated();
    memory.delete(id);
    try {
      dbDeleteRoom(id);
    } catch {
      /* ignore */
    }
  },

  clear(): void {
    memory.clear();
    hydrated = true;
    try {
      dbClearRooms();
    } catch {
      /* ignore */
    }
  },

  /** Test-only: drop cache and reopen DB connection. */
  _resetForTests(): void {
    memory.clear();
    hydrated = false;
  },
};
