import { tickRoom } from "@/lib/battle/timers";
import { subscribe } from "@/lib/room-events";
import { getRoom, touchRoomActivity } from "@/lib/room-service";
import { toClientView } from "@/lib/room-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");

  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          cleanup();
        }
      };

      const send = (data: unknown) => {
        safeEnqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
        if (unsub) unsub();
        unsub = null;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      if (playerId) {
        touchRoomActivity(roomId, playerId);
      }
      tickRoom(roomId);
      const room = getRoom(roomId);
      if (room) {
        send({ room: toClientView(room) });
      } else {
        send({ error: "ROOM_NOT_FOUND" });
      }

      unsub = subscribe((id) => {
        if (id !== roomId || closed) return;
        if (playerId) touchRoomActivity(roomId, playerId);
        tickRoom(roomId);
        const r = getRoom(roomId);
        if (!r) {
          send({ error: "ROOM_NOT_FOUND" });
          return;
        }
        send({ room: toClientView(r) });
      });

      heartbeat = setInterval(() => {
        if (playerId) touchRoomActivity(roomId, playerId);
        safeEnqueue(encoder.encode(`: ping\n\n`));
      }, 10_000);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (unsub) unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
