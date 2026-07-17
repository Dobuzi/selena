import { tickRoom } from "@/lib/battle/timers";
import { subscribe } from "@/lib/room-events";
import { getRoom } from "@/lib/room-service";
import { toClientView } from "@/lib/room-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      tickRoom(roomId);
      const room = getRoom(roomId);
      if (room) {
        send({ room: toClientView(room) });
      } else {
        send({ error: "ROOM_NOT_FOUND" });
      }

      const unsub = subscribe((id) => {
        if (id !== roomId) return;
        tickRoom(roomId);
        const r = getRoom(roomId);
        if (!r) {
          send({ error: "ROOM_NOT_FOUND" });
          return;
        }
        send({ room: toClientView(r) });
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15_000);

      const cancel = () => {
        clearInterval(heartbeat);
        unsub();
      };

      // @ts-expect-error attach for cancel
      controller._cancel = cancel;
    },
    cancel() {
      // cleaned via start cancel if needed
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
