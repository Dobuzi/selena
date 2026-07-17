import { NextResponse } from "next/server";
import { startRoom } from "@/lib/room-service";
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
  const result = await startRoom(roomId, playerId);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ room: toClientView(result.room) });
}
