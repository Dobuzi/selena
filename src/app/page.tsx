"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePlayerId } from "@/hooks/useRoomSession";
import { browserCreateOrJoin } from "@/lib/browser-rooms";
import { isStaticMode } from "@/lib/platform";
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

const DEVELOPER = "빛가온 초등학교 1학년 1반 김도아";

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
      if (!schoolName.trim() || !examHallName.trim()) {
        setError("학교 이름과 시험장 이름을 입력해 주세요.");
        return;
      }
      if (!nickname.trim()) {
        setError("닉네임을 입력해 주세요.");
        return;
      }

      if (isStaticMode()) {
        const result = browserCreateOrJoin({
          intent: mode === "create" ? "create" : "join",
          schoolName,
          examHallName,
          nickname,
          subject,
          difficulty: mode === "create" ? difficulty : undefined,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        savePlayerId(result.room.roomId, result.playerId);
        router.push(`/room?id=${encodeURIComponent(result.room.roomId)}`);
        return;
      }

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
      const text = await res.text();
      let data: {
        message?: string;
        room?: { roomId: string };
        playerId?: string;
      } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(
          res.ok
            ? "서버 응답을 읽지 못했어요. 서버를 재시작해 주세요."
            : `서버 오류 (${res.status}). 개발 서버가 켜져 있는지 확인해 주세요.`,
        );
        return;
      }
      if (!res.ok) {
        setError(data.message ?? "입장에 실패했어요.");
        return;
      }
      if (!data.room?.roomId || !data.playerId) {
        setError("입장 정보가 불완전해요. 다시 시도해 주세요.");
        return;
      }
      savePlayerId(data.room.roomId, data.playerId);
      router.push(`/room?id=${encodeURIComponent(data.room.roomId)}`);
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "네트워크 오류가 났어요. 서버(localhost:3000)가 실행 중인지 확인해 주세요.";
      setError(
        msg.includes("fetch") || msg.includes("Failed")
          ? "서버에 연결하지 못했어요. 터미널에서 npm run dev 를 확인해 주세요."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const staticHint = isStaticMode();

  return (
    <main className="app-shell flex flex-col">
      <div className="flex flex-1 flex-col justify-center py-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-widest text-indigo-600">
            중학 시험장 배틀
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Selena
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            학교·시험장 이름으로 들어가서, 문제로 배틀해요
          </p>
          {staticHint && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-left text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
              GitHub Pages 데모 모드입니다. 연습 문제(폴백)로 솔로·같은 기기 탭
              멀티가 가능해요. 서버/AI 전체 기능은 Docker 이미지를 사용하세요.
            </p>
          )}
        </div>

        {mode === "choose" && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode("create")}
              data-testid="home-create"
              className="btn-touch w-full bg-indigo-600 text-lg text-white shadow-lg shadow-indigo-200 active:bg-indigo-700"
            >
              시험장 만들기
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              data-testid="home-join"
              className="btn-touch w-full bg-white text-lg text-slate-900 ring-1 ring-slate-300 active:bg-slate-50"
            >
              시험장 입장
            </button>
          </div>
        )}

        {(mode === "create" || mode === "join") && (
          <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <button
              type="button"
              className="btn-touch min-h-11 justify-start px-2 text-base font-semibold text-slate-600"
              onClick={() => setMode("choose")}
            >
              ← 뒤로
            </button>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === "create" ? "시험장 만들기" : "시험장 입장"}
            </h2>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">학교 이름</span>
              <input
                data-testid="input-school"
                autoComplete="organization"
                enterKeyHint="next"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 placeholder:text-slate-400"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="예: 선린중학교"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">시험장 이름</span>
              <input
                data-testid="input-hall"
                enterKeyHint="next"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 placeholder:text-slate-400"
                value={examHallName}
                onChange={(e) => setExamHallName(e.target.value)}
                placeholder="예: 3학년 1반 수학"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">닉네임</span>
              <input
                data-testid="input-nickname"
                autoComplete="nickname"
                enterKeyHint="done"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 placeholder:text-slate-400"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="예: 민수"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-slate-700">과목</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSubject(s.value)}
                    className={`chip-touch ${
                      subject === s.value
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-900 active:bg-slate-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "create" && (
              <div>
                <span className="text-sm font-medium text-slate-700">난이도</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {DIFFS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDifficulty(d.value)}
                      className={`chip-touch ${
                        difficulty === d.value
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-900 active:bg-slate-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-3 text-sm leading-relaxed text-rose-700">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              data-testid="submit-enter"
              onClick={() => void submit()}
              className="btn-touch w-full bg-indigo-600 text-lg text-white active:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "들어가는 중…" : "입장하기"}
            </button>
          </div>
        )}
      </div>

      <footer className="dev-credit" data-testid="developer-credit">
        <span>개발</span>
        <strong>{DEVELOPER}</strong>
      </footer>
    </main>
  );
}
