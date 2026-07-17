"use client";

import type { ClientRoom } from "@/lib/room-view";

export function ResultPanel({
  room,
  playerId,
  onRematch,
  onHome,
  rematching = false,
}: {
  room: ClientRoom;
  playerId: string | null;
  onRematch: () => void;
  onHome: () => void;
  rematching?: boolean;
}) {
  const isHost = playerId === room.hostPlayerId;
  const ranked = [...room.players]
    .filter((p) => p.answers.length > 0 || p.activeInRound)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6 pb-4">
      <div className="text-center" data-testid="result-panel">
        <h2 className="text-3xl font-black text-slate-900">결과</h2>
        {room.mode === "solo" && (
          <p className="mt-2 text-xl font-bold text-indigo-600">
            {room.soloResult === "win" && "승리! 🎉"}
            {room.soloResult === "lose" && "패배… 다시 도전해 봐요"}
            {room.soloResult === "draw" && "무승부!"}
          </p>
        )}
      </div>

      {room.mode === "multi" && (
        <ol className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {ranked.map((p, i) => (
            <li
              key={p.playerId}
              className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3"
            >
              <span className="text-base">
                <span className="mr-2 font-bold text-indigo-600">{i + 1}.</span>
                {p.nickname}
                {p.playerId === playerId && (
                  <span className="ml-2 text-xs text-slate-500">(나)</span>
                )}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {p.score}점
              </span>
            </li>
          ))}
        </ol>
      )}

      {room.review.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">문항 복습</p>
          {room.review.map((item, idx) => (
            <div
              key={item.question.id}
              className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200 sm:text-base"
            >
              <p className="font-medium leading-relaxed text-slate-900">
                {idx + 1}. {item.question.stem}
              </p>
              <p className="mt-1.5 text-emerald-700">
                정답: {item.question.choices[item.question.correctIndex]}
              </p>
              <p className="mt-1 leading-relaxed text-slate-600">
                {item.question.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent pt-4 sm:static sm:flex-row sm:bg-none sm:pt-0">
        {isHost && (
          <button
            type="button"
            onClick={onRematch}
            disabled={rematching}
            className="btn-touch flex-1 bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60"
          >
            {rematching ? "준비 중…" : "다시 하기"}
          </button>
        )}
        <button
          type="button"
          onClick={onHome}
          className="btn-touch flex-1 bg-slate-200 text-slate-900 active:bg-slate-300"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
