import { NextResponse } from "next/server";
import { leaveRoom } from "@/lib/room-service";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId ?? "");
  if (playerId) leaveRoom(roomId, playerId);
  return NextResponse.json({ ok: true });
}
