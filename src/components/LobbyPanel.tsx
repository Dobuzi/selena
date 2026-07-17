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
}: {
  room: ClientRoom;
  playerId: string | null;
  onStart: () => void;
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
        <h2 className="text-2xl font-bold text-slate-900">
          {room.schoolName} · {room.examHallName}
        </h2>
        <p className="mt-1 text-slate-600">
          {SUBJECT_LABEL[room.subject] ?? room.subject} · 난이도{" "}
          {room.difficulty === "easy"
            ? "하"
            : room.difficulty === "hard"
              ? "상"
              : "중"}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold text-slate-700">참가자 ({n}/4)</p>
        <ul className="space-y-2">
          {connected.map((p) => (
            <li
              key={p.playerId}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
            >
              <span className="font-medium text-slate-800">{p.nickname}</span>
              {p.playerId === room.hostPlayerId && (
                <span className="text-xs text-indigo-600">호스트</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          type="button"
          onClick={onStart}
          disabled={!canSolo && !canMulti}
          className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-lg font-bold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {canSolo ? "솔로 연습 시작 (vs AI)" : canMulti ? "멀티 배틀 시작" : "인원을 확인해 주세요"}
        </button>
      ) : (
        <p className="text-center text-slate-500">호스트가 시작하기를 기다려 주세요…</p>
      )}
    </div>
  );
}
