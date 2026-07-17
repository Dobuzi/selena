import { NextResponse } from "next/server";
import { tickRoom } from "@/lib/battle/timers";
import { getRoom } from "@/lib/room-service";
import { toClientView } from "@/lib/room-view";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  tickRoom(roomId);
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json(
      { code: "ROOM_NOT_FOUND", message: "시험장이 없어요." },
      { status: 404 },
    );
  }
  return NextResponse.json({ room: toClientView(room) });
}
