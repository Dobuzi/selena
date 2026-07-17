"use client";

import { useEffect, useState } from "react";
import type { ClientRoom } from "@/lib/room-view";

export function BattlePanel({
  room,
  playerId,
  onAnswer,
}: {
  room: ClientRoom;
  playerId: string | null;
  onAnswer: (choiceIndex: number) => void;
}) {
  const me = room.players.find((p) => p.playerId === playerId);
  const q = room.currentQuestion;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  if (!me?.activeInRound) {
    return (
      <div className="rounded-2xl bg-amber-50 p-8 text-center ring-1 ring-amber-200">
        <p className="text-xl font-bold text-amber-900">다음 판부터 참여해요</p>
        <p className="mt-2 text-amber-800">지금은 다른 친구들이 배틀 중이에요.</p>
      </div>
    );
  }

  if (!q) {
    return <p className="text-center text-slate-500">문제를 불러오는 중…</p>;
  }

  const remaining = q.deadlineAt
    ? Math.max(0, Math.ceil((q.deadlineAt - now) / 1000))
    : 0;
  const answered = me.answers.some((a) => a.questionId === q.id);
  const isReveal = room.battlePhase === "reveal";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm font-medium">
        {room.mode === "solo" ? (
          <>
            <span className="text-rose-600">나 {"❤️".repeat(me.hp)}{"🤍".repeat(Math.max(0, 3 - me.hp))}</span>
            <span className="text-slate-500">
              Q {q.index + 1}/{q.total}
            </span>
            <span className="text-indigo-600">AI {"❤️".repeat(room.aiHp)}{"🤍".repeat(Math.max(0, 3 - room.aiHp))}</span>
          </>
        ) : (
          <>
            <span className="text-indigo-700">점수 {me.score}</span>
            <span className="text-slate-500">
              Q {q.index + 1}/{q.total}
            </span>
            <span className="tabular-nums text-slate-700">⏱ {isReveal ? "해설" : `${remaining}s`}</span>
          </>
        )}
      </div>

      {room.mode === "solo" && (
        <div className="text-center text-sm text-slate-500">
          {isReveal ? "해설" : `⏱ ${remaining}s`}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-lg font-semibold leading-relaxed text-slate-900">{q.stem}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {q.choices.map((choice, i) => {
          const isCorrect = isReveal && q.correctIndex === i;
          const myPick =
            me.answers.find((a) => a.questionId === q.id)?.choiceIndex === i;
          return (
            <button
              key={i}
              type="button"
              disabled={answered || isReveal}
              onClick={() => onAnswer(i)}
              className={`rounded-2xl px-4 py-3 text-left font-medium transition ring-1 ${
                isCorrect
                  ? "bg-emerald-100 text-emerald-900 ring-emerald-300"
                  : myPick
                    ? "bg-indigo-100 text-indigo-900 ring-indigo-300"
                    : "bg-white text-slate-900 ring-slate-300 hover:bg-slate-50 disabled:opacity-70"
              }`}
            >
              <span className="mr-2 font-bold text-slate-700">{i + 1}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      {isReveal && q.explanation && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
          <p className="text-sm font-semibold">해설</p>
          <p className="mt-1">{q.explanation}</p>
        </div>
      )}

      {answered && !isReveal && room.mode === "multi" && (
        <p className="text-center text-slate-500">다른 친구를 기다리는 중…</p>
      )}
    </div>
  );
}
