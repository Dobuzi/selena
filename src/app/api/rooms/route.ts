import { NextResponse } from "next/server";
import { createOrJoinRoom } from "@/lib/room-service";
import { toClientView } from "@/lib/room-view";
import type { Difficulty, JoinIntent, Subject } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { code: "VALIDATION", message: "잘못된 요청이에요." },
      { status: 400 },
    );
  }

  const result = createOrJoinRoom({
    intent: body.intent as JoinIntent,
    schoolName: String(body.schoolName ?? ""),
    examHallName: String(body.examHallName ?? ""),
    subject: body.subject as Subject,
    difficulty: body.difficulty as Difficulty | undefined,
    nickname: String(body.nickname ?? ""),
  });

  if (!result.ok) {
    const status = result.code === "ROOM_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status },
    );
  }

  return NextResponse.json({
    room: toClientView(result.room),
    playerId: result.playerId,
  });
}
