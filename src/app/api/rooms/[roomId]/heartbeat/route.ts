import { NextResponse } from "next/server";
import { getRoom, touchRoomActivity } from "@/lib/room-service";
import { toClientView } from "@/lib/room-view";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId ?? "");
  if (!playerId) {
    return NextResponse.json(
      { code: "VALIDATION", message: "playerId가 필요해요." },
      { status: 400 },
    );
  }
  touchRoomActivity(roomId, playerId);
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json(
      { code: "ROOM_NOT_FOUND", message: "시험장이 없어요." },
      { status: 404 },
    );
  }
  return NextResponse.json({ room: toClientView(room), ok: true });
}
