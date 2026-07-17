import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { resetDbConnection, dbGetRoom } from "@/lib/room-db";
import { roomStore } from "@/lib/room-store";
import { createOrJoinRoom } from "@/lib/room-service";

describe("roomStore SQLite persistence", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(
      os.tmpdir(),
      `selena-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
    );
    process.env.SELENA_DB_PATH = dbFile;
    resetDbConnection();
    roomStore._resetForTests();
  });

  afterEach(() => {
    roomStore.clear();
    resetDbConnection();
    delete process.env.SELENA_DB_PATH;
    for (const f of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* ignore */
      }
    }
  });

  it("writes room payload to sqlite file", () => {
    const created = createOrJoinRoom({
      intent: "create",
      schoolName: "Persist중",
      examHallName: "1반",
      subject: "math",
      difficulty: "easy",
      nickname: "테스트",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const fromDb = dbGetRoom(created.room.roomId);
    expect(fromDb?.schoolName).toBe("Persist중");
    expect(fromDb?.players[0]?.nickname).toBe("테스트");
    expect(fs.existsSync(dbFile)).toBe(true);
  });

  it("reloads room after memory drop", () => {
    const created = createOrJoinRoom({
      intent: "create",
      schoolName: "Reload중",
      examHallName: "2반",
      subject: "korean",
      difficulty: "medium",
      nickname: "민수",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const roomId = created.room.roomId;

    roomStore._resetForTests();
    resetDbConnection();

    const reloaded = roomStore.get(roomId);
    expect(reloaded?.examHallName).toBe("2반");
    expect(reloaded?.players).toHaveLength(1);
  });
});
