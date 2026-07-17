"use client";

import type { ClientRoom } from "@/lib/room-view";

export function ResultPanel({
  room,
  playerId,
  onRematch,
  onHome,
}: {
  room: ClientRoom;
  playerId: string | null;
  onRematch: () => void;
  onHome: () => void;
}) {
  const isHost = playerId === room.hostPlayerId;
  const ranked = [...room.players]
    .filter((p) => p.answers.length > 0 || p.activeInRound)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div className="text-center">
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
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
            >
              <span>
                <span className="mr-2 font-bold text-indigo-600">{i + 1}.</span>
                {p.nickname}
                {p.playerId === playerId && (
                  <span className="ml-2 text-xs text-slate-500">(나)</span>
                )}
              </span>
              <span className="font-semibold tabular-nums">{p.score}점</span>
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
              className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200"
            >
              <p className="font-medium text-slate-900">
                {idx + 1}. {item.question.stem}
              </p>
              <p className="mt-1 text-emerald-700">
                정답: {item.question.choices[item.question.correctIndex]}
              </p>
              <p className="mt-1 text-slate-600">{item.question.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {isHost && (
          <button
            type="button"
            onClick={onRematch}
            className="flex-1 rounded-2xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500"
          >
            다시 하기
          </button>
        )}
        <button
          type="button"
          onClick={onHome}
          className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-800 hover:bg-slate-200"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
