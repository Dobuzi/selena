"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePlayerId } from "@/hooks/useRoomSession";
import type { Difficulty, Subject } from "@/lib/types";

type Mode = "choose" | "create" | "join";

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: "korean", label: "국어" },
  { value: "english", label: "영어" },
  { value: "math", label: "수학" },
  { value: "science", label: "과학" },
];

const DIFFS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "하" },
  { value: "medium", label: "중" },
  { value: "hard", label: "상" },
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [schoolName, setSchoolName] = useState("");
  const [examHallName, setExamHallName] = useState("");
  const [nickname, setNickname] = useState("");
  const [subject, setSubject] = useState<Subject>("math");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: mode === "create" ? "create" : "join",
          schoolName,
          examHallName,
          nickname,
          subject,
          difficulty: mode === "create" ? difficulty : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "입장에 실패했어요.");
        return;
      }
      savePlayerId(data.room.roomId, data.playerId);
      router.push(`/room/${data.room.roomId}`);
    } catch {
      setError("네트워크 오류가 났어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          중학 시험장 배틀
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">Selena</h1>
        <p className="mt-2 text-slate-600">
          학교·시험장 이름으로 들어가서, 문제로 배틀해요
        </p>
      </div>

      {mode === "choose" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500"
          >
            시험장 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="rounded-2xl bg-white py-4 text-lg font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            시험장 입장
          </button>
        </div>
      )}

      {(mode === "create" || mode === "join") && (
        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <button
            type="button"
            className="text-sm text-slate-500"
            onClick={() => setMode("choose")}
          >
            ← 뒤로
          </button>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "create" ? "시험장 만들기" : "시험장 입장"}
          </h2>

          <label className="block">
            <span className="text-sm font-medium text-slate-600">학교 이름</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="예: 선린중학교"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">시험장 이름</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={examHallName}
              onChange={(e) => setExamHallName(e.target.value)}
              placeholder="예: 3학년 1반 수학"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">닉네임</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 민수"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-slate-600">과목</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSubject(s.value)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    subject === s.value
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "create" && (
            <div>
              <span className="text-sm font-medium text-slate-600">난이도</span>
              <div className="mt-2 flex gap-2">
                {DIFFS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      difficulty === d.value
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-lg font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? "들어가는 중…" : "입장하기"}
          </button>
        </div>
      )}
    </main>
  );
}
