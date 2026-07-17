# Selena — 중학 시험장 배틀 연습 게임

**Date:** 2026-07-17  
**Status:** Approved (product design)  
**Approach:** 가벼운 웹 MVP (Next.js full-stack)

## 1. Problem & Goal

중학생이 국어·영어·수학·과학 시험을 **게임처럼** 연습할 수 있는 웹 게임을 만든다.

핵심 경험:

1. **학교 이름 + 시험장 이름**으로 연습 방에 들어간다.
2. **AI**가 중학 수준 객관식 문제를 생성한다.
3. **솔로(vs AI)** 또는 **같은 시험장 멀티 배틀**로 문제를 푼다.

성공 기준 (MVP):

- 링크만으로 브라우저에서 플레이 가능
- 방 생성 → 문제 생성 → 솔로 1판 완주
- 같은 방 코드로 2인 이상 멀티 1판 완주
- AI 실패 시에도 폴백 문제로 플레이 가능

## 2. Users & Scope

| 항목 | 결정 |
|------|------|
| 대상 | 중학생 (중1~중3) |
| 과목 | 국어, 영어, 수학, 과학 |
| 플랫폼 | 웹 브라우저 (PC·모바일 브라우저) |
| 계정 | 없음 (닉네임만) |
| 문제 출처 | AI 생성 + 내장 폴백 세트 |

### In scope (MVP)

- 홈: 시험장 만들기 / 입장
- 학교 이름, 시험장 이름, 닉네임, 과목, 난이도
- AI 객관식 문제 생성 (10문항)
- 솔로 배틀 (HP 기반 vs AI)
- 멀티 배틀 (2~4명, 점수·속도)
- 결과 화면 (점수/HP, 문항별 정오)
- 에러 시 폴백 문제, 기본 연결 복구

### Out of scope (later)

- 로그인·회원·영구 프로필
- 글로벌 랭킹 DB
- 오답 노트 / 학습 통계
- 캐릭터 육성·코스메틱
- 네이티브 모바일 앱
- 선생님용 출제·검수 도구
- 실제 학교 시험지 연동

## 3. User Flow

```
홈
 ├─ 시험장 만들기 ──┐
 └─ 시험장 입장 ────┤
                    ▼
            입장 폼 (학교, 시험장, 닉네임, 과목, 난이도*)
                    ▼
              대기실 / 모드 선택
              ├─ 솔로 연습 (vs AI)
              └─ 멀티 배틀 (친구와)
                    ▼
              문제 생성 중 (generating)
                    ▼
                   배틀 (10문항)
                    ▼
                   결과
```

\* 난이도: **방 생성 시** 호스트 기준으로 고정. 같은 `학교+시험장+과목` 방에 나중에 들어온 플레이어는 기존 난이도를 따름.

### Create vs Join

| 액션 | 방이 없을 때 | 방이 이미 있을 때 |
|------|--------------|-------------------|
| **시험장 만들기** | 새 방 생성. 요청자가 host. 난이도 적용. | 기존 방 **입장**과 동일 처리. 클라이언트가 입력한 난이도는 **무시**. host는 기존 유지. |
| **시험장 입장** | 거절: “시험장이 없어요. 만들기를 눌러 주세요.” | 입장 허용 (아래 상태별 규칙). 난이도는 방 값 사용. |

둘 다 같은 `POST /api/rooms` 또는 `join` 계열로 구현해도 되지만, 요청에 `intent: "create" | "join"`을 두어 위 표대로 분기한다.

## 4. Core Rules

### 공통

| 규칙 | 값 |
|------|-----|
| 문항 수 | 10 (고정) |
| 문항당 시간 | 20초 (초과 = 오답) |
| 형식 | 4지선다 객관식 |
| 난이도 | easy / medium / hard (하·중·상) |
| 해설 | 문항 종료 시 1~2문장 표시. **솔로:** 제출(또는 시간 초과) 직후. **멀티:** 해당 문항 active 전원 제출 또는 타이머 종료 시점(개인 제출 직후 정답 미공개) |

### 솔로 (vs AI)

- 플레이어 HP 3, AI HP 3
- 정답 → AI HP −1
- 오답 또는 시간 초과 → 플레이어 HP −1
- AI는 체력 바 역할만 하며 별도로 문제를 풀지 않음
- **즉시 종료:** 플레이어 HP 0 또는 AI HP 0이 되는 순간 남은 문항 없이 `finished`
- 조기 종료 시 결과의 “문항별 정오”: **플레이한 문항만** 표시. 미출제 문항은 목록에 넣지 않음
- 10문항을 모두 끝냈을 때 둘 다 HP > 0이면 HP 비교 (동점이면 무승부)

### 멀티 (같은 시험장)

- 인원 **최소 2 · 최대 4** (시작 시 접속 중인 플레이어 기준 검증)
- 호스트만 `start` 가능
- 호스트가 시작 → 전원 동일 문항·동기화 타이머
- 점수: 정답 +100, 남은 시간 보너스 `remainingSeconds × 2`
- 오답/시간 초과: +0
- 10문항 후 총점 내림차순 순위
- 배틀 중 입장: **대기 참여만** (관전 UI 없음). `status=battling|generating`인 방에 join하면 방에 들어가지만 **이번 판 명단에 포함되지 않음**
- **명단 고정:** `start` 성공 시점에 `connected === true`인 플레이어만 `activeInRound = true`. 이후 join한 플레이어는 `activeInRound = false`
- 문항 진행·“전원 제출” 판정·점수/순위는 **`activeInRound` 플레이어만** 대상. 대기 인원은 제출 불가·점수 0·순위 제외
- `finished` 후 재경기 시 모든 접속 플레이어의 `activeInRound`를 다음 `start`에서 다시 계산

## 5. Room Identity & Lifecycle

### Identity

- 입력: `schoolName`, `examHallName`, `subject`
- 정규화: trim, 연속 공백 축소, 대소문자 통일(유니코드 고려 시 NFC + lowercase where applicable)
- `roomId = hash(normalizedSchool + "|" + normalizedExamHall + "|" + subject)`
- 같은 조합 → 같은 방
- 방 메타: 호스트, 난이도, status, mode, players, questions

닉네임 중복 시 서버가 접미사 부여 (`민수`, `민수_2`, …).

### Solo vs multi exclusivity

한 `Room`은 동시에 하나의 배틀만 진행한다.

| 상황 | 동작 |
|------|------|
| `lobby`, 접속 1명 | **솔로만** 시작 가능 (멀티 버튼 비활성) |
| `lobby`, 접속 2~4명 | **멀티만** 시작 가능 (솔로 버튼 비활성) |
| `generating` / `battling` | 추가 join 허용, `activeInRound=false` 대기. 모드 전환·재시작 불가 |
| `finished` | join 허용 (로비와 동일하게 닉네임 부여). 재경기 전까지 관전 결과 화면 또는 대기. 아래 재경기 규칙 |

한 방은 동시에 하나의 배틀만 진행한다. 솔로와 멀티를 동시에 돌리지 않는다.

### Host disconnect

- 호스트가 끊기면 **남은 접속 플레이어 중 가장 먼저 입장한 사람**에게 host 이양
- 남은 플레이어 0명이면 방은 곧 삭제(또는 idle TTL 후 삭제)
- `battling` 중 호스트 이탈: 호스트 이양 후 배틀 계속. 이탈한 호스트는 멀티에서 기권(점수 동결)

### 재경기 (“다시 하기”)

1. 호스트가 `POST .../rematch` 호출
2. 상태만 `finished` → `lobby`로 전환. 점수/HP/answers/`currentQuestionIndex`/questions 클리어. `mode → null`, 전원 `activeInRound → false`. **문제 생성은 하지 않음**
3. 호스트가 다시 `start` → 그때 `generating` + 새 AI 생성 (실패 시 폴백). 직전 세트 재사용 안 함
4. 난이도·학교·시험장·과목 유지. `finished` 중 입장한 사람·이전 대기자 포함, 다음 `start` 시점 접속자가 명단
5. 모드: `start` 시점 인원 규칙 (1=솔로, 2+=멀티)

## 6. Architecture

### Stack

- **Next.js** (App Router) — UI + API Routes 단일 레포
- **실시간:** WebSocket (Next 커스텀 서버, 또는 Socket.io / 경량 WS 어댑터 — 구현 계획에서 확정)
- **상태 저장 (MVP):** 프로세스 메모리 또는 SQLite (방·문제 캐시). 재시작 시 방 소멸 허용
- **LLM:** SpaceXAI(또는 호환 chat completions API)로 문제 생성
- **인증:** 없음. `playerId`는 서버 발급 UUID + 클라이언트 세션 스토리지

### Modules

| Module | Responsibility |
|--------|----------------|
| UI | 홈, 입장, 대기실, 배틀, 결과 |
| Room Service | 방 생성/입장, 플레이어 목록, status 전이 |
| AI Question Gen | 프롬프트 → JSON 문항, 스키마 검증, 폴백 |
| Battle Engine | 솔로 HP, 멀티 점수/타이머, 제출 판정 (서버 authoritative) |
| Realtime | 멀티 상태 브로드캐스트 |

### Trust boundary

- **정답 인덱스(`correctIndex`)는 서버만 보유**하다가 해당 문항 종료(전원 제출 또는 시간 종료) 후 reveal
- 클라이언트는 제출 시 choice index만 전송; 판정은 서버

## 7. Data Model

```
Room {
  roomId: string
  schoolName: string
  examHallName: string
  subject: "korean" | "english" | "math" | "science"
  difficulty: "easy" | "medium" | "hard"
  hostPlayerId: string
  players: Player[]
  questions: Question[]          // includes correctIndex server-side
  status: "lobby" | "generating" | "battling" | "finished"
  mode: "solo" | "multi" | null
  currentQuestionIndex: number
  questionDeadlineAt: number | null  // epoch ms
}

Player {
  playerId: string
  nickname: string
  hp: number           // solo
  score: number        // multi
  connected: boolean
  activeInRound: boolean  // frozen true only for roster at start
  joinedAt: number        // for host transfer order
  answers: Answer[]
}

Question {
  id: string
  stem: string
  choices: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
}

Answer {
  questionId: string
  choiceIndex: number | null  // null = timeout
  correct: boolean
  points: number
  answeredAt: number
}
```

### Client-safe question payload

배틀 중 클라이언트로 보내는 문항:

```
{ id, stem, choices, index, total, deadlineAt }
```

reveal 후:

```
{ ... , correctIndex, explanation }
```

## 8. AI Question Generation

### Input

- subject, difficulty, count=10, locale=ko (중학 교육과정 톤)

### Output schema (validated)

```json
{
  "questions": [
    {
      "stem": "string",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ]
}
```

### Failure handling

1. 요청 1회 재시도
2. 스키마/필드 불량 문항 폐기 후 부족분만 재요청 또는 폴백 보충
3. 최종 실패 시 **과목별 내장 폴백 10문항** 사용, UI에 “연습 문제로 진행” 안내

### Quality constraints (prompt)

- 중학생 수준, 교육적으로 부적절하지 않은 내용
- 선택지 길이·난이도 균형
- 수학은 계산 가능·정답 유일
- 영어는 중학 어휘 수준

## 9. API / Realtime (conceptual)

HTTP (예시):

- `POST /api/rooms` — body: `{ intent: "create" | "join", schoolName, examHallName, subject, difficulty?, nickname }`  
  - create: 없으면 생성, 있으면 기존 방 입장(난이도 무시)  
  - join: 없으면 404/에러, 있으면 입장
- `POST /api/rooms/:roomId/start` — host only; 인원에 따라 mode 자동(`solo` if 1 else `multi`); **명단 고정 + 문제 생성 전담** (`generating` → `battling`)
- `POST /api/rooms/:roomId/rematch` — host only; `finished` → `lobby` 만 (문제 생성 없음)
- `POST /api/rooms/:roomId/answer` — `activeInRound` 플레이어만; 솔로 또는 멀티 제출
- `GET /api/rooms/:roomId` — 폴링 폴백

WebSocket events (멀티 중심):

- `room:state` — 전체 스냅샷 (정답 제외 또는 reveal 후 포함)
- `question:start` / `question:reveal`
- `player:joined` / `player:left`
- `battle:finished`

## 10. Error Handling

| Case | Behavior |
|------|----------|
| AI generation failure | Retry once → fallback set |
| Invalid AI JSON | Drop bad items; refill; else fallback |
| Multi disconnect | Brief reconnect; else forfeit player (`activeInRound` clear for scoring), others continue. If zero active players remain (all left/forfeit) while waiters may still be present → force `finished` with scores frozen |
| Host disconnect | Transfer host to earliest remaining joiner (`joinedAt`); 0 players → room deleted. During `generating`, transfer host and keep generation in flight |
| Join when `finished` | Allowed; player waits for rematch/start |
| Empty school/hall | Client+server validation reject |
| Join intent, room missing | Error: 시험장 없음 → 만들기로 유도 |
| Duplicate nickname | Auto suffix `_2`, `_3`, … |
| Room full (4 connected) | Join rejected with message |
| Start multi with fewer than 2 players | Reject start |
| Start solo with ≥ 2 players | Reject start (UI also hides) |
| Server restart | Rooms lost; client shows “시험장이 없어요” and return home |

## 11. Testing Strategy

- Unit: roomId normalization; solo HP transitions; multi scoring (`100 + remaining*2`); question schema validation
- Integration: create room → generate with **fallback** → solo complete → result
- Multi (as feasible): 2 players join → start → answer → ranking
- Manual: mobile browser layout smoke test

## 12. UI Screens (MVP)

1. **Home** — 만들기 / 입장
2. **Join form** — 학교, 시험장, 닉네임, 과목, 난이도(생성 시)
3. **Lobby** — 참가자 목록, 솔로/멀티 선택, 시작
4. **Generating** — 로딩 + 폴백 안내 가능
5. **Battle** — HP 또는 점수, 타이머, 문항, 4지 버튼
6. **Result** — 승패/순위, 문항별 정오 리스트, 다시 하기 / 홈

톤: 중학생이 부담 없이 쓰는 밝은 시험장·배틀 느낌. 과한 다크 UI 강제 없음.

## 13. Non-Goals & Risks

| Risk | Mitigation |
|------|------------|
| AI 문제 품질 불안정 | 스키마 검증 + 폴백 세트 |
| 멀티 동기화 복잡도 | 서버 authoritative 타이머; 문항 단위 동기화 |
| 메모리 저장 휘발 | MVP 허용; 문서에 명시 |
| 부정행위 (정답 추측 API) | 정답 서버 보관; rate limit 간단 적용 가능 |

## 14. Implementation Phases (high level)

1. 프로젝트 스캐폴딩 + 홈/입장 UI + Room Service (메모리)
2. 폴백 문제 + 솔로 배틀 완주
3. AI 문제 생성 연동 + 스키마 검증
4. 멀티 대기실 + WebSocket 배틀
5. 결과 화면 polish + 테스트 보강

상세 작업 분해는 implementation plan 문서에서 진행한다.
