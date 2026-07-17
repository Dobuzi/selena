# Selena Exam Battle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser MVP where middle-school students enter a room by school + exam-hall name, get AI (or fallback) quiz questions, and play solo HP battles or multiplayer score battles.

**Architecture:** Next.js App Router monorepo: pure domain modules under `src/lib/*`, HTTP mutations under `src/app/api/*`, in-memory `RoomStore`, and **SSE** (`/api/rooms/[roomId]/events`) for multiplayer push (HTTP POST for all actions; no custom WebSocket server). Server is authoritative for answers, timers, and scoring. Client never receives `correctIndex` until question reveal.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + React, Vitest, openai SDK → SpaceXAI (`XAI_API_KEY`, `baseURL: https://api.x.ai/v1`, model `grok-4.5`), SSE for realtime.

**Spec:** `docs/superpowers/specs/2026-07-17-selena-exam-battle-design.md`

---

## File Map

| Path | Responsibility |
|------|----------------|
| `package.json` | Scripts: `dev`, `build`, `test`, `lint` |
| `vitest.config.ts` | Node environment unit tests |
| `src/lib/types.ts` | Room, Player, Question, Answer, enums |
| `src/lib/room-id.ts` | Normalize + hash → `roomId` |
| `src/lib/nickname.ts` | Unique nickname with `_2` suffix |
| `src/lib/room-store.ts` | In-memory Map singleton |
| `src/lib/room-service.ts` | create/join/start/rematch/disconnect/host transfer |
| `src/lib/battle/scoring.ts` | Multi points: `100 + remainingSeconds * 2` |
| `src/lib/battle/solo.ts` | Solo HP apply + early finish |
| `src/lib/battle/engine.ts` | Answer submit, timeout, question advance, finish |
| `src/lib/questions/schema.ts` | Zod (or hand validators) for AI JSON |
| `src/lib/questions/fallback.ts` | 10 questions × 4 subjects |
| `src/lib/questions/generate.ts` | SpaceXAI call + retry + fallback |
| `src/lib/room-view.ts` | Strip secrets for client/SSE snapshots |
| `src/lib/constants.ts` | QUESTION_COUNT=10, TIME_LIMIT_MS=20000, MAX_PLAYERS=4 |
| `src/app/api/rooms/route.ts` | POST create/join |
| `src/app/api/rooms/[roomId]/route.ts` | GET snapshot |
| `src/app/api/rooms/[roomId]/start/route.ts` | POST start |
| `src/app/api/rooms/[roomId]/rematch/route.ts` | POST rematch |
| `src/app/api/rooms/[roomId]/answer/route.ts` | POST answer |
| `src/app/api/rooms/[roomId]/events/route.ts` | SSE stream |
| `src/app/api/rooms/[roomId]/leave/route.ts` | POST leave/disconnect |
| `src/app/page.tsx` | Home: create / join entry |
| `src/app/room/[roomId]/page.tsx` | Lobby / generating / battle / result shell |
| `src/components/JoinForm.tsx` | Form fields |
| `src/components/LobbyPanel.tsx` | Players + start |
| `src/components/BattlePanel.tsx` | Question UI + timer |
| `src/components/ResultPanel.tsx` | Scores + rematch |
| `src/hooks/useRoomSession.ts` | playerId in sessionStorage, poll/SSE |
| `src/app/globals.css` | Bright exam-battle styling |
| `tests/*.test.ts` | Unit tests mirroring lib modules |

---

## Chunk 1: Scaffold + domain core

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js app in repo root**

```bash
cd /Users/jw/Dev/grok/selena
npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --tailwind --turbopack --yes
```

If create-next-app refuses non-empty dir, create in temp and move files, keeping `docs/` and `.git`.

- [ ] **Step 2: Add test + AI deps**

```bash
npm i openai zod
npm i -D vitest @vitejs/plugin-react
```

`package.json` scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 3: Verify dev server boots**

```bash
npm run dev
```

Expected: ready on localhost; stop after smoke check.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Types + constants + roomId

**Files:**
- Create: `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/room-id.ts`
- Test: `tests/room-id.test.ts`

- [ ] **Step 1: Write failing tests for normalization**

```ts
// tests/room-id.test.ts
import { describe, it, expect } from "vitest";
import { normalizeLabel, makeRoomId } from "@/lib/room-id";

describe("normalizeLabel", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeLabel("  선린  중학교  ")).toBe("선린 중학교");
  });
  it("lowercases ascii", () => {
    expect(normalizeLabel("ABC School")).toBe("abc school");
  });
});

describe("makeRoomId", () => {
  it("is stable for same school+hall+subject", () => {
    const a = makeRoomId("선린중", "3-1 수학", "math");
    const b = makeRoomId("  선린중 ", "3-1  수학", "math");
    expect(a).toBe(b);
  });
  it("differs by subject", () => {
    expect(makeRoomId("A", "B", "math")).not.toBe(makeRoomId("A", "B", "korean"));
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- tests/room-id.test.ts
```

Expected: cannot find module or functions undefined.

- [ ] **Step 3: Implement**

```ts
// src/lib/constants.ts
export const QUESTION_COUNT = 10;
export const TIME_LIMIT_MS = 20_000;
export const MAX_PLAYERS = 4;
export const INITIAL_HP = 3;
export const BASE_CORRECT_POINTS = 100;
export const TIME_BONUS_PER_SEC = 2;
export const REVEAL_MS = 3_000;

// src/lib/types.ts
export type Subject = "korean" | "english" | "math" | "science";
export type Difficulty = "easy" | "medium" | "hard";
export type RoomStatus = "lobby" | "generating" | "battling" | "finished";
export type GameMode = "solo" | "multi" | null;

export interface Question {
  id: string;
  stem: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface Answer {
  questionId: string;
  choiceIndex: number | null;
  correct: boolean;
  points: number;
  answeredAt: number;
}

export interface Player {
  playerId: string;
  nickname: string;
  hp: number;
  score: number;
  connected: boolean;
  activeInRound: boolean;
  joinedAt: number;
  answers: Answer[];
}

export interface Room {
  roomId: string;
  schoolName: string;
  examHallName: string;
  subject: Subject;
  difficulty: Difficulty;
  hostPlayerId: string;
  players: Player[];
  questions: Question[];
  status: RoomStatus;
  mode: GameMode;
  currentQuestionIndex: number;
  questionDeadlineAt: number | null;
  battlePhase: "answering" | "reveal" | null;
  revealUntilAt: number | null;
  usedFallback: boolean;
  aiHp: number; // solo only meaningful
}

// src/lib/room-id.ts
import { createHash } from "crypto";
import type { Subject } from "./types";

export function normalizeLabel(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function makeRoomId(
  schoolName: string,
  examHallName: string,
  subject: Subject,
): string {
  const key = `${normalizeLabel(schoolName)}|${normalizeLabel(examHallName)}|${subject}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- tests/room-id.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/room-id.ts tests/room-id.test.ts
git commit -m "feat: room id normalization and core types"
```

---

### Task 3: Scoring + solo HP helpers

**Files:**
- Create: `src/lib/battle/scoring.ts`, `src/lib/battle/solo.ts`
- Test: `tests/scoring.test.ts`, `tests/solo.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// tests/scoring.test.ts
import { describe, it, expect } from "vitest";
import { multiPoints } from "@/lib/battle/scoring";

describe("multiPoints", () => {
  it("awards 100 + remaining*2 when correct", () => {
    expect(multiPoints(true, 15)).toBe(130);
  });
  it("awards 0 when wrong", () => {
    expect(multiPoints(false, 15)).toBe(0);
  });
  it("clamps remaining seconds at 0", () => {
    expect(multiPoints(true, -3)).toBe(100);
  });
});

// tests/solo.test.ts
import { describe, it, expect } from "vitest";
import { applySoloOutcome } from "@/lib/battle/solo";

describe("applySoloOutcome", () => {
  it("decrements aiHp on correct", () => {
    expect(applySoloOutcome({ playerHp: 3, aiHp: 3, correct: true })).toEqual({
      playerHp: 3, aiHp: 2, finished: false, result: null,
    });
  });
  it("decrements playerHp on wrong and finishes at 0", () => {
    expect(applySoloOutcome({ playerHp: 1, aiHp: 2, correct: false })).toEqual({
      playerHp: 0, aiHp: 2, finished: true, result: "lose",
    });
  });
  it("finishes with win when aiHp hits 0", () => {
    expect(applySoloOutcome({ playerHp: 2, aiHp: 1, correct: true })).toEqual({
      playerHp: 2, aiHp: 0, finished: true, result: "win",
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/scoring.test.ts tests/solo.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/battle/scoring.ts
import { BASE_CORRECT_POINTS, TIME_BONUS_PER_SEC } from "@/lib/constants";

export function multiPoints(correct: boolean, remainingSeconds: number): number {
  if (!correct) return 0;
  const rem = Math.max(0, Math.floor(remainingSeconds));
  return BASE_CORRECT_POINTS + rem * TIME_BONUS_PER_SEC;
}

// src/lib/battle/solo.ts
export type SoloResult = "win" | "lose" | "draw" | null;

export function applySoloOutcome(input: {
  playerHp: number;
  aiHp: number;
  correct: boolean;
}): { playerHp: number; aiHp: number; finished: boolean; result: SoloResult } {
  let { playerHp, aiHp } = input;
  if (input.correct) aiHp -= 1;
  else playerHp -= 1;
  if (playerHp <= 0) return { playerHp: 0, aiHp, finished: true, result: "lose" };
  if (aiHp <= 0) return { playerHp, aiHp: 0, finished: true, result: "win" };
  return { playerHp, aiHp, finished: false, result: null };
}

export function finalSoloResult(playerHp: number, aiHp: number): SoloResult {
  if (playerHp > aiHp) return "win";
  if (playerHp < aiHp) return "lose";
  return "draw";
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- tests/scoring.test.ts tests/solo.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/battle tests/scoring.test.ts tests/solo.test.ts
git commit -m "feat: solo HP and multi scoring helpers"
```

---

### Task 4: Nickname + room store + room service (create/join)

**Files:**
- Create: `src/lib/nickname.ts`, `src/lib/room-store.ts`, `src/lib/room-service.ts`
- Test: `tests/room-service.test.ts`

- [ ] **Step 1: Failing tests for create/join rules**

```ts
// tests/room-service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { roomStore } from "@/lib/room-store";
import { createOrJoinRoom } from "@/lib/room-service";

beforeEach(() => roomStore.clear());

describe("createOrJoinRoom", () => {
  it("create makes a new room and sets host", () => {
    const r = createOrJoinRoom({
      intent: "create",
      schoolName: "선린중",
      examHallName: "3-1",
      subject: "math",
      difficulty: "medium",
      nickname: "민수",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.room.status).toBe("lobby");
    expect(r.room.players[0].nickname).toBe("민수");
    expect(r.room.hostPlayerId).toBe(r.playerId);
    expect(r.room.difficulty).toBe("medium");
  });

  it("join fails when room missing", () => {
    const r = createOrJoinRoom({
      intent: "join",
      schoolName: "없는학교",
      examHallName: "없음",
      subject: "math",
      nickname: "철수",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("ROOM_NOT_FOUND");
  });

  it("create on existing room joins and ignores difficulty", () => {
    createOrJoinRoom({
      intent: "create",
      schoolName: "A",
      examHallName: "B",
      subject: "math",
      difficulty: "easy",
      nickname: "민수",
    });
    const r2 = createOrJoinRoom({
      intent: "create",
      schoolName: "A",
      examHallName: "B",
      subject: "math",
      difficulty: "hard",
      nickname: "영희",
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.room.difficulty).toBe("easy");
    expect(r2.room.players).toHaveLength(2);
    expect(r2.room.hostPlayerId).not.toBe(r2.playerId);
  });

  it("suffixes duplicate nicknames", () => {
    createOrJoinRoom({
      intent: "create",
      schoolName: "A",
      examHallName: "B",
      subject: "korean",
      difficulty: "easy",
      nickname: "민수",
    });
    const r2 = createOrJoinRoom({
      intent: "join",
      schoolName: "A",
      examHallName: "B",
      subject: "korean",
      nickname: "민수",
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.room.players.map((p) => p.nickname).sort()).toEqual(["민수", "민수_2"]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/room-service.test.ts
```

- [ ] **Step 3: Implement store, nickname, createOrJoin**

```ts
// src/lib/nickname.ts
export function uniqueNickname(desired: string, existing: string[]): string {
  const base = desired.trim() || "학생";
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

// src/lib/room-store.ts
import type { Room } from "./types";

const rooms = new Map<string, Room>();

export const roomStore = {
  get(id: string) {
    return rooms.get(id);
  },
  set(room: Room) {
    rooms.set(room.roomId, room);
  },
  delete(id: string) {
    rooms.delete(id);
  },
  clear() {
    rooms.clear();
  },
};

// src/lib/room-service.ts — createOrJoinRoom as tested:
// - intent create: get or create by makeRoomId; new room host=player; existing: join, ignore difficulty
// - intent join: missing → { ok:false, code:"ROOM_NOT_FOUND" }; else join
// - max 4 connected players → ROOM_FULL
// - reject empty school/hall
// - playerId = crypto.randomUUID()
// - join allowed in lobby|generating|battling|finished; activeInRound=false always on join
```

Full `createOrJoinRoom` signature:

```ts
export type JoinInput = {
  intent: "create" | "join";
  schoolName: string;
  examHallName: string;
  subject: Subject;
  difficulty?: Difficulty;
  nickname: string;
};

export type JoinResult =
  | { ok: true; room: Room; playerId: string }
  | { ok: false; code: string; message: string };
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- tests/room-service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/nickname.ts src/lib/room-store.ts src/lib/room-service.ts tests/room-service.test.ts
git commit -m "feat: in-memory rooms with create/join rules"
```

---

## Chunk 2: Fallback questions + battle engine + solo API/UI

### Task 5: Fallback questions + schema validation

**Files:**
- Create: `src/lib/questions/schema.ts`, `src/lib/questions/fallback.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Failing schema tests**

```ts
// tests/schema.test.ts
import { describe, it, expect } from "vitest";
import { parseQuestionsPayload } from "@/lib/questions/schema";
import { getFallbackQuestions } from "@/lib/questions/fallback";

describe("parseQuestionsPayload", () => {
  it("accepts valid 10-question payload", () => {
    const qs = getFallbackQuestions("math");
    const parsed = parseQuestionsPayload({ questions: qs.map(({ stem, choices, correctIndex, explanation }) => ({ stem, choices, correctIndex, explanation })) });
    expect(parsed.ok).toBe(true);
  });
  it("rejects wrong choice count", () => {
    const parsed = parseQuestionsPayload({
      questions: [{ stem: "x", choices: ["a", "b"], correctIndex: 0, explanation: "e" }],
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("getFallbackQuestions", () => {
  it("returns exactly 10 questions per subject", () => {
    for (const s of ["korean", "english", "math", "science"] as const) {
      expect(getFallbackQuestions(s)).toHaveLength(10);
    }
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- tests/schema.test.ts
```

- [ ] **Step 3: Implement Zod schema + 40 fallback questions (10×4)**

Use middle-school appropriate static content. Assign `id` via `crypto.randomUUID()` when loading into a room (or stable ids like `math-01`).

```ts
// parseQuestionsPayload returns { ok:true, questions: Question[] } | { ok:false, error:string }
// correctIndex must be 0..3; choices length 4; explanation non-empty string
```

- [ ] **Step 4: Run — PASS**

```bash
npm test -- tests/schema.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/questions tests/schema.test.ts
git commit -m "feat: question schema and subject fallback banks"
```

---

### Task 6: Battle engine (answer, timeout, reveal, advance)

**Files:**
- Create: `src/lib/battle/engine.ts`, `src/lib/room-view.ts`, `src/lib/battle/timers.ts`
- Test: `tests/battle-engine.test.ts`
- Modify: `src/lib/types.ts` (phase field), `src/lib/room-service.ts`

**Question phase model (required):**

```ts
// On Room:
// battlePhase: "answering" | "reveal" | null
// revealUntilAt: number | null  // epoch ms; REVEAL_MS = 3000
```

Flow per question:

1. **answering** — `questionDeadlineAt = now + TIME_LIMIT_MS`; clients submit choices; multi does **not** show `correctIndex` yet
2. When solo submits/timeouts **or** multi all active answered **or** deadline passed → **resolve** (score/HP), set `battlePhase = "reveal"`, `revealUntilAt = now + 3000`, publish view **with** `correctIndex` + `explanation`
3. When `revealUntilAt` passed → advance index or finish; next question back to **answering**

**Server-authoritative timeout (required mechanism):**

- On entering **answering**, call `scheduleQuestionTimeout(roomId)` in `src/lib/battle/timers.ts`:
  - `clearTimeout` any previous handle for that room
  - `setTimeout(() => { ensureRoomDeadline(roomId); }, TIME_LIMIT_MS + 50)`
- `ensureRoomDeadline(roomId)`:
  - load room; if not `battling` / not `answering`, return
  - if `Date.now() < questionDeadlineAt`, reschedule residual; else mark missing active answers as timeout (`choiceIndex: null`) and resolve → reveal
- On entering **reveal**, `scheduleRevealAdvance(roomId)` with `setTimeout(..., REVEAL_MS)` calling `advanceAfterReveal(roomId)`
- Also call `ensureRoomDeadline` / `advanceAfterReveal` **lazily** at the start of every mutating API + when building SSE/GET snapshots (covers process sleep / missed timers)
- Store timeout handles in a module-level `Map<roomId, NodeJS.Timeout>` (fine for single-process MVP)
- On rematch, leave/delete room, or finish: `clearRoomTimers(roomId)` so late timeouts cannot mutate lobby/deleted rooms

- [ ] **Step 1: Failing tests**

Cover:
1. Solo correct reduces `aiHp`; after resolve, view includes `correctIndex` only in reveal phase
2. Solo player HP 0 → after resolve, status `finished` (may skip long reveal or use short reveal then finish)
3. Solo completes all 10 with both HP > 0 → `finalSoloResult` win/lose/draw
4. Multi correct adds `100 + remaining*2`
5. Multi only `activeInRound` players can answer
6. Multi does not advance until reveal timer (or forced `advanceAfterReveal`); all-active-answered triggers resolve→reveal first
7. Deadline path: with fake timers, no submit → timeouts scored, then reveal
8. After last question multi → finished with rankings by score

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- tests/battle-engine.test.ts
```

- [ ] **Step 3: Implement engine API**

```ts
// startRound(room, hostPlayerId) — validate host, status lobby, headcount:
//   1 player → mode solo; 2-4 → multi; else error
// freeze activeInRound for connected players
// set questions from getFallbackQuestions (Task 9 swaps to generate)
// status generating then battling
// index=0, battlePhase="answering", scheduleQuestionTimeout
// reset hp/score/answers/aiHp

// submitAnswer(room, playerId, choiceIndex | null) — only answering phase + activeInRound
// maybeResolveCurrentQuestion — if ready, apply scores, battlePhase=reveal, scheduleRevealAdvance
// advanceAfterReveal — next question or finish; solo early finish may jump to finished after resolve
// ensureRoomDeadline — see above
// toClientView(room) — if battlePhase==="reveal" (or finished review), include correctIndex+explanation for current/played
```

- [ ] **Step 4: Run — PASS** (use Vitest fake timers for timeout/reveal)

- [ ] **Step 5: Commit**

```bash
git add src/lib/battle src/lib/room-view.ts src/lib/types.ts src/lib/room-service.ts tests/battle-engine.test.ts
git commit -m "feat: battle engine with server timers and reveal phase"
```
---

### Task 7: HTTP API routes (rooms, start, answer, rematch, get)

**Files:**
- Create: API routes listed in File Map (except events/leave for now)
- Test: optional thin tests or manual curl in steps

- [ ] **Step 1: Implement `POST /api/rooms`**

Body: JoinInput. Response: `{ room: clientView, playerId }` or error JSON `{ code, message }` with 4xx.

- [ ] **Step 2: Implement `GET /api/rooms/[roomId]?playerId=`**

At handler entry call `ensureRoomDeadline(roomId)` then `advanceAfterReveal(roomId)` (lazy timer catch-up). Return client-safe snapshot. 404 if missing.

- [ ] **Step 3: Implement `POST .../start`** header or body `playerId`

Call `startRound`. For now attach fallback questions + `usedFallback: true`.

- [ ] **Step 4: Implement `POST .../answer`** `{ playerId, choiceIndex }`

- [ ] **Step 5: Implement `POST .../rematch`** host only → lobby reset per spec

- [ ] **Step 6: Manual smoke with curl**

```bash
# create
curl -s -X POST localhost:3000/api/rooms -H 'content-type: application/json' \
  -d '{"intent":"create","schoolName":"선린중","examHallName":"3-1","subject":"math","difficulty":"easy","nickname":"민수"}'
# start + answer using returned ids
```

Expected: room progresses; wrong ids return 4xx.

- [ ] **Step 7: Commit**

```bash
git add src/app/api
git commit -m "feat: REST API for rooms, start, answer, rematch"
```

---

### Task 8: Home + room UI for solo end-to-end

**Files:**
- Create/modify: `src/app/page.tsx`, `src/app/room/[roomId]/page.tsx`, components, `src/hooks/useRoomSession.ts`, `globals.css`

- [ ] **Step 1: Home page**

Two buttons → form with school, exam hall, nickname, subject, difficulty (difficulty only emphasized for create). Submit → `POST /api/rooms` → store `playerId` in `sessionStorage` key `selena:playerId:${roomId}` → navigate `/room/[roomId]`.

- [ ] **Step 2: Room page state machine UI**

Poll `GET` every 1s (SSE later). Render:
- lobby: player list, host Start button (label Solo vs Multi by count)
- generating: spinner + “연습 문제로 진행” if `usedFallback`
- battling + **activeInRound**: BattlePanel
  - **answering:** stem, 4 choices, countdown from `questionDeadlineAt`, hearts or scores; disable choices after own submit (multi: “다른 친구 기다리는 중”)
  - **reveal:** show correct choice highlight + `explanation` for ~3s; no new submit
- battling + **!activeInRound** (mid-join waiter): simple “다음 판부터 참여해요” panel — **no** answer buttons (spec: 관전 UI 없음)
- finished: ResultPanel — solo win/lose/draw or multi ranking; question review for **played answers only**; Rematch (host) + Home

- [ ] **Step 3: Manual solo playthrough**

Browser: create room → start → answer until finished.

Expected: HP changes, brief explanation after each question, early end works, result shows only played questions.

- [ ] **Step 4: Commit**

```bash
git add src/app src/components src/hooks
git commit -m "feat: solo lobby/battle/result UI"
```

---

## Chunk 3: AI generation + multiplayer SSE

### Task 9: SpaceXAI question generation

**Files:**
- Create: `src/lib/questions/generate.ts`
- Modify: `src/lib/battle/engine.ts` or `room-service` start path
- Test: `tests/generate.test.ts` (mock fetch / inject client)

- [ ] **Step 1: Implement `generateQuestions({ subject, difficulty, count })`**

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// Prefer OpenAI-compatible chat.completions:
//   model: "grok-4.5"
//   messages: [system, user]
//   response_format: { type: "json_object" } if supported; else instruct "JSON only"
// system: middle-school KR quiz writer; user: subject/difficulty/count
// parse with parseQuestionsPayload; retry once; pad with fallback; if zero valid use full fallback
// return { questions, usedFallback: boolean }
```

Never call from client. If `XAI_API_KEY` missing → immediate full fallback (dev-friendly).

- [ ] **Step 2: Wire into `startRound`**

Set `status = generating`, `publishRoom`, **then** await generate (so multi peers see loading) → set questions → `battling` + deadline.

- [ ] **Step 3: Unit test with mock**

Mock generate function injected or `vi.stubEnv` + mock OpenAI: invalid JSON → fallback; valid → usedFallback false.

- [ ] **Step 4: Commit**

```bash
git add src/lib/questions/generate.ts src/lib/battle src/lib/room-service.ts tests/generate.test.ts
git commit -m "feat: AI question generation with fallback"
```

Note: document in README: set `XAI_API_KEY` in `.env.local`.

---

### Task 10: Leave/disconnect + host transfer

**Files:**
- Create: `src/app/api/rooms/[roomId]/leave/route.ts`
- Modify: `src/lib/room-service.ts`
- Test: extend `tests/room-service.test.ts`

- [ ] **Step 1: Tests**

- Host leave with 2 players → new host = earliest `joinedAt` remaining
- Last player leave → room deleted
- Battling multi forfeit: `activeInRound` false, if zero active → finished

- [ ] **Step 2: Implement `leaveRoom(roomId, playerId)`**

- [ ] **Step 3: Client session**

- Persist `playerId` in `sessionStorage` per room
- On room page load: if stored `playerId` still in room.players, **re-attach** (set `connected: true` via lightweight `POST .../heartbeat` or re-join with same playerId support)
- Prefer **not** calling leave on every refresh; call leave only on explicit “나가기” or `sendBeacon` when tab closes **and** no remount within ~2s (optional debounce). MVP acceptable: leave on unmount + re-join as new player if reconnect fails — document limitation in README

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: leave room and host transfer"
```

---

### Task 11: SSE multiplayer sync

**Files:**
- Create: `src/app/api/rooms/[roomId]/events/route.ts`
- Modify: `src/hooks/useRoomSession.ts`, `src/lib/room-store.ts` (optional EventEmitter)

- [ ] **Step 1: Add simple pub/sub on room updates**

```ts
// src/lib/room-events.ts
type Listener = (roomId: string) => void;
const listeners = new Set<Listener>();
export function publishRoom(roomId: string) { for (const l of listeners) l(roomId); }
export function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }
```

Call `publishRoom` after every mutating service function.

- [ ] **Step 2: SSE route**

```ts
// ReadableStream; on subscribe send current snapshot; on publish if roomId matches enqueue `data: ${JSON.stringify(view)}\n\n`
// heartbeat comment every 15s
```

- [ ] **Step 3: Client: EventSource preferred, poll fallback every 2s if SSE fails**

- [ ] **Step 4: Manual multi test**

Two browsers (or normal + incognito): same school/hall/subject join → start multi → both answer → rankings.

Expected: same questions, scores update, wait-joiner mid-battle cannot answer.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: SSE multiplayer room sync"
```

---

### Task 12: Polish, README, full test suite

**Files:**
- Create: `README.md`
- Modify: UI copy/CSS, `.env.example`

- [ ] **Step 1: README**

How to run, `XAI_API_KEY`, create/join flow, solo vs multi rules summary, note rooms are in-memory.

- [ ] **Step 2: `.env.example`**

```
XAI_API_KEY=
```

- [ ] **Step 3: Run full tests + build**

```bash
npm test
npm run build
```

Expected: all tests pass; production build succeeds.

- [ ] **Step 4: Final commit**

```bash
git add README.md .env.example
git commit -m "docs: README and env example; polish MVP"
```

---

## Chunk review checkpoints

After finishing each Chunk (1, 2, 3), re-read the matching sections of the design spec and confirm:

| Spec item | Covered by |
|-----------|------------|
| create/join intent | Task 4, 7, 8 |
| solo HP immediate end | Task 3, 6, 8 |
| multi scoring + roster freeze | Task 3, 6, 11 |
| rematch lobby-only | Task 6/7 |
| AI + fallback | Task 5, 9 |
| no auth | all |
| SSE/realtime | Task 11 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-selena-exam-battle.md`.

**Next:** Implement with **subagent-driven-development** (fresh subagent per task + review). Do not start coding until the user confirms execution.
