import { NextResponse } from "next/server";
import { leaveRoom } from "@/lib/room-service";

export const runtime = "nodejs";

async function parseBody(req: Request): Promise<{ playerId?: string }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as { playerId?: string };
  }
  // sendBeacon may send as text/plain blob
  const text = await req.text().catch(() => "");
  try {
    return JSON.parse(text) as { playerId?: string };
  } catch {
    return {};
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const body = await parseBody(req);
  const playerId = String(body.playerId ?? "");
  if (playerId) leaveRoom(roomId, playerId);
  return NextResponse.json({ ok: true });
}
