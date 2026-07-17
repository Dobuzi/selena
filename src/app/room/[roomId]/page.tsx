"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useRoomSession } from "@/hooks/useRoomSession";
import { LobbyPanel } from "@/components/LobbyPanel";
import { BattlePanel } from "@/components/BattlePanel";
import { ResultPanel } from "@/components/ResultPanel";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const {
    room,
    playerId,
    error,
    loading,
    starting,
    answering,
    rematching,
    start,
    answer,
    rematch,
    leave,
  } = useRoomSession(roomId);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
        <p className="text-slate-500">시험장 들어가는 중…</p>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold text-rose-600">{error}</p>
        <button
          type="button"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-white"
          onClick={() => router.push("/")}
        >
          홈으로
        </button>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="mx-auto min-h-screen max-w-lg p-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          className="text-sm text-slate-500 hover:text-slate-800"
          onClick={async () => {
            await leave();
            router.push("/");
          }}
        >
          ← 나가기
        </button>
        <span className="text-sm font-semibold text-indigo-600">Selena</span>
      </header>

      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {(room.status === "lobby" || (room.status === "generating" && starting)) && (
        <LobbyPanel
          room={room}
          playerId={playerId}
          starting={starting || room.status === "generating"}
          onStart={() => void start()}
        />
      )}

      {room.status === "generating" && !starting && (
        <div
          className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200"
          data-testid="generating"
        >
          <p className="text-xl font-bold text-slate-900">문제 만드는 중…</p>
          <p className="mt-2 text-slate-500">AI가 중학 문제를 준비하고 있어요</p>
        </div>
      )}

      {room.status === "battling" && (
        <>
          {room.usedFallback && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              연습 문제로 진행해요
            </p>
          )}
          {answering && (
            <p className="mb-2 text-center text-sm font-medium text-indigo-700">
              제출 중…
            </p>
          )}
          <BattlePanel
            room={room}
            playerId={playerId}
            answering={answering}
            onAnswer={(i) => void answer(i)}
          />
        </>
      )}

      {room.status === "finished" && (
        <ResultPanel
          room={room}
          playerId={playerId}
          rematching={rematching}
          onRematch={() => void rematch()}
          onHome={async () => {
            await leave();
            router.push("/");
          }}
        />
      )}
    </main>
  );
}
