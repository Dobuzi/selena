import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { Room } from "./types";

type Db = InstanceType<typeof Database>;

let db: Db | null = null;

function resolveDbPath(): string {
  if (process.env.SELENA_DB_PATH) return process.env.SELENA_DB_PATH;
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return ":memory:";
  }
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "selena.sqlite");
}

export function getDb(): Db {
  if (db) return db;
  const file = resolveDbPath();
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

/** Test helper: close and drop singleton so next getDb is fresh. */
export function resetDbConnection(): void {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
  db = null;
}

export function dbGetRoom(roomId: string): Room | undefined {
  const row = getDb()
    .prepare("SELECT payload FROM rooms WHERE room_id = ?")
    .get(roomId) as { payload: string } | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.payload) as Room;
  } catch {
    return undefined;
  }
}

export function dbSetRoom(room: Room): void {
  getDb()
    .prepare(
      `INSERT INTO rooms (room_id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(room_id) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
    )
    .run(room.roomId, JSON.stringify(room), Date.now());
}

export function dbDeleteRoom(roomId: string): void {
  getDb().prepare("DELETE FROM rooms WHERE room_id = ?").run(roomId);
}

export function dbClearRooms(): void {
  getDb().prepare("DELETE FROM rooms").run();
}

export function dbLoadAllRooms(): Room[] {
  const rows = getDb()
    .prepare("SELECT payload FROM rooms")
    .all() as { payload: string }[];
  const out: Room[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.payload) as Room);
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}
