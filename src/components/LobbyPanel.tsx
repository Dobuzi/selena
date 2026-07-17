"use client";

import type { ClientRoom } from "@/lib/room-view";

const SUBJECT_LABEL: Record<string, string> = {
  korean: "국어",
  english: "영어",
  math: "수학",
  science: "과학",
};

export function LobbyPanel({
  room,
  playerId,
  onStart,
  starting = false,
}: {
  room: ClientRoom;
  playerId: string | null;
  onStart: () => void;
  starting?: boolean;
}) {
  const connected = room.players.filter((p) => p.connected);
  const isHost = playerId === room.hostPlayerId;
  const n = connected.length;
  const canSolo = n === 1;
  const canMulti = n >= 2 && n <= 4;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">시험장</p>
        <h2 className="mt-1 break-keep text-2xl font-bold leading-snug text-slate-900">
          {room.schoolName} · {room.examHallName}
        </h2>
        <p className="mt-2 text-base text-slate-600">
          {SUBJECT_LABEL[room.subject] ?? room.subject} · 난이도{" "}
          {room.difficulty === "easy"
            ? "하"
            : room.difficulty === "hard"
              ? "상"
              : "중"}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          참가자 ({n}/4)
        </p>
        <ul className="space-y-2">
          {connected.map((p) => (
            <li
              key={p.playerId}
              className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3"
            >
              <span className="text-base font-medium text-slate-900">
                {p.nickname}
              </span>
              {p.playerId === room.hostPlayerId && (
                <span className="text-xs font-semibold text-indigo-600">
                  호스트
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          type="button"
          onClick={onStart}
          disabled={starting || (!canSolo && !canMulti)}
          data-testid="start-battle"
          className="btn-touch w-full bg-indigo-600 text-lg text-white shadow active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {starting
            ? "문제 준비 중…"
            : canSolo
              ? "솔로 연습 시작 (vs AI)"
              : canMulti
                ? "멀티 배틀 시작"
                : "인원을 확인해 주세요"}
        </button>
      ) : (
        <p className="py-3 text-center text-base text-slate-500">
          호스트가 시작하기를 기다려 주세요…
        </p>
      )}
    </div>
  );
}
