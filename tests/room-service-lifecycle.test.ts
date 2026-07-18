import { describe, it, expect, beforeEach } from "vitest";
import { roomStore } from "@/lib/room-store";
import {
  createOrJoinRoom,
  leaveRoom,
  rematch,
  reconnectPlayer,
  startRoom,
  answerRoom,
  touchRoomActivity,
  pruneRoom,
} from "@/lib/room-service";
import { PLAYER_STALE_MS } from "@/lib/constants";

beforeEach(() => roomStore.clear());

describe("room-service lifecycle", () => {
  it("startRoom solo then answer progresses battle", async () => {
    const c = createOrJoinRoom({
      intent: "create",
      schoolName: "Life",
      examHallName: "1",
      subject: "math",
      difficulty: "easy",
      nickname: "나",
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    const started = await startRoom(c.room.roomId, c.playerId);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.room.status).toBe("battling");
    expect(started.room.mode).toBe("solo");
    expect(started.room.questions.length).toBe(10);

    const q = started.room.questions[0];
    const ans = answerRoom(c.room.roomId, c.playerId, q.correctIndex);
    expect(ans.ok).toBe(true);
    if (!ans.ok) return;
    expect(ans.room.battlePhase === "reveal" || ans.room.status === "finished").toBe(
      true,
    );
  });

  it("leave transfers host and deletes empty room", () => {
    const a = createOrJoinRoom({
      intent: "create",
      schoolName: "Host",
      examHallName: "H",
      subject: "math",
      nickname: "A",
    });
    const b = createOrJoinRoom({
      intent: "join",
      schoolName: "Host",
      examHallName: "H",
      subject: "math",
      nickname: "B",
    });
    if (!a.ok || !b.ok) throw new Error("setup");
    expect(a.room.hostPlayerId).toBe(a.playerId);

    leaveRoom(a.room.roomId, a.playerId);
    const room = roomStore.get(a.room.roomId);
    expect(room?.players).toHaveLength(1);
    expect(room?.hostPlayerId).toBe(b.playerId);

    leaveRoom(a.room.roomId, b.playerId);
    expect(roomStore.get(a.room.roomId)).toBeUndefined();
  });

  it("reconnect restores connected flag", () => {
    const c = createOrJoinRoom({
      intent: "create",
      schoolName: "Re",
      examHallName: "R",
      subject: "math",
      nickname: "N",
    });
    if (!c.ok) throw new Error("create");
    const p = c.room.players[0];
    p.connected = false;
    roomStore.set(c.room);

    const r = reconnectPlayer(c.room.roomId, c.playerId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.room.players[0].connected).toBe(true);
  });

  it("rematch only from finished", async () => {
    const c = createOrJoinRoom({
      intent: "create",
      schoolName: "Rm",
      examHallName: "R",
      subject: "math",
      difficulty: "easy",
      nickname: "N",
    });
    if (!c.ok) throw new Error("create");
    await startRoom(c.room.roomId, c.playerId);

    const bad = rematch(c.room.roomId, c.playerId);
    expect(bad.ok).toBe(false);

    const room = roomStore.get(c.room.roomId)!;
    room.status = "finished";
    roomStore.set(room);

    const ok = rematch(c.room.roomId, c.playerId);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.room.status).toBe("lobby");
    expect(ok.room.mode).toBeNull();
  });

  it("pruneRoom drops stale players", () => {
    const c = createOrJoinRoom({
      intent: "create",
      schoolName: "Stale",
      examHallName: "S",
      subject: "math",
      nickname: "Live",
    });
    if (!c.ok) throw new Error("create");
    const ghost = createOrJoinRoom({
      intent: "join",
      schoolName: "Stale",
      examHallName: "S",
      subject: "math",
      nickname: "Ghost",
    });
    if (!ghost.ok) throw new Error("join");

    const room = roomStore.get(c.room.roomId)!;
    const g = room.players.find((p) => p.playerId === ghost.playerId)!;
    g.lastSeenAt = Date.now() - PLAYER_STALE_MS - 1000;
    roomStore.set(room);

    touchRoomActivity(c.room.roomId, c.playerId);
    const pruned = pruneRoom(c.room.roomId, Date.now());
    expect(pruned?.players.map((p) => p.nickname)).toEqual(["Live"]);
  });
});
