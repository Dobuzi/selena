"use client";

import { useEffect, useState } from "react";
import type { ClientRoom } from "@/lib/room-view";

export function BattlePanel({
  room,
  playerId,
  onAnswer,
  answering = false,
}: {
  room: ClientRoom;
  playerId: string | null;
  onAnswer: (choiceIndex: number) => void;
  answering?: boolean;
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
        <p className="mt-2 text-base text-amber-800">
          지금은 다른 친구들이 배틀 중이에요.
        </p>
      </div>
    );
  }

  if (!q) {
    return (
      <p className="text-center text-base text-slate-500">문제를 불러오는 중…</p>
    );
  }

  const remaining = q.deadlineAt
    ? Math.max(0, Math.ceil((q.deadlineAt - now) / 1000))
    : 0;
  const answered = me.answers.some((a) => a.questionId === q.id);
  const isReveal = room.battlePhase === "reveal";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Status bar: wraps on narrow phones */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold sm:text-base">
        {room.mode === "solo" ? (
          <>
            <span className="text-rose-600">
              나 {"❤️".repeat(me.hp)}
              {"🤍".repeat(Math.max(0, 3 - me.hp))}
            </span>
            <span className="text-slate-600">
              Q {q.index + 1}/{q.total}
            </span>
            <span className="text-indigo-600">
              AI {"❤️".repeat(room.aiHp)}
              {"🤍".repeat(Math.max(0, 3 - room.aiHp))}
            </span>
          </>
        ) : (
          <>
            <span className="text-indigo-700">점수 {me.score}</span>
            <span className="text-slate-600">
              Q {q.index + 1}/{q.total}
            </span>
            <span className="tabular-nums text-slate-800">
              ⏱ {isReveal ? "해설" : `${remaining}s`}
            </span>
          </>
        )}
      </div>

      {room.mode === "solo" && (
        <div className="text-center text-base font-medium text-slate-600">
          {isReveal ? "해설" : `⏱ ${remaining}초`}
        </div>
      )}

      <div
        className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"
        data-testid="question-stem"
      >
        <p className="text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">
          {q.stem}
        </p>
      </div>

      {/* Phone: 1 col (big taps). iPad+: 2 cols */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {q.choices.map((choice, i) => {
          const isCorrect = isReveal && q.correctIndex === i;
          const myPick =
            me.answers.find((a) => a.questionId === q.id)?.choiceIndex === i;
          return (
            <button
              key={i}
              type="button"
              disabled={answered || isReveal || answering}
              onClick={() => onAnswer(i)}
              data-testid={`choice-${i}`}
              className={`choice-touch ring-1 transition ${
                isCorrect
                  ? "bg-emerald-100 text-emerald-900 ring-emerald-300"
                  : myPick
                    ? "bg-indigo-100 text-indigo-900 ring-indigo-300"
                    : "bg-white text-slate-900 ring-slate-300 active:bg-slate-50 disabled:opacity-70"
              }`}
            >
              <span className="mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {i + 1}
              </span>
              <span className="align-middle">{choice}</span>
              {answering && myPick ? " …" : ""}
            </button>
          );
        })}
      </div>

      {isReveal && q.explanation && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
          <p className="text-sm font-semibold">해설</p>
          <p className="mt-1 text-base leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {answered && !isReveal && room.mode === "multi" && (
        <p className="py-2 text-center text-base text-slate-500">
          다른 친구를 기다리는 중…
        </p>
      )}
    </div>
  );
}
