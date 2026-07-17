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

## 4. Core Rules

### 공통

| 규칙 | 값 |
|------|-----|
| 문항 수 | 10 (고정) |
| 문항당 시간 | 20초 (초과 = 오답) |
| 형식 | 4지선다 객관식 |
| 난이도 | easy / medium / hard (하·중·상) |
| 해설 | 제출 직후 1~2문장 표시 |

### 솔로 (vs AI)

- 플레이어 HP 3, AI HP 3
- 정답 → AI HP −1
- 오답 또는 시간 초과 → 플레이어 HP −1
- AI는 체력 바 역할만 하며 별도로 문제를 풀지 않음
- 승리: AI HP 0, 또는 10문항 종료 후 HP가 더 많음
- 패배: 플레이어 HP 0
- 동점(둘 다 HP > 0이고 동일): 무승부

### 멀티 (같은 시험장)

- 인원 2~4명
- 호스트가 시작 → 전원 동일 문항·동기화 타이머
- 점수: 정답 +100, 남은 시간 보너스 `remainingSeconds × 2`
- 오답/시간 초과: +0
- 10문항 후 총점 내림차순 순위
- 배틀 진행 중 입장한 플레이어는 다음 판부터 참여 (현재 판 관전 또는 대기실 대기)

## 5. Room Identity

- 입력: `schoolName`, `examHallName`, `subject`
- 정규화: trim, 연속 공백 축소, 대소문자 통일(유니코드 고려 시 NFC + lowercase where applicable)
- `roomId = hash(normalizedSchool + "|" + normalizedExamHall + "|" + subject)`
- 같은 조합 → 같은 방
- 방 메타: 호스트, 난이도, status, mode, players, questions

닉네임 중복 시 서버가 접미사 부여 (`민수`, `민수_2`, …).

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

- `POST /api/rooms` — 생성 또는 기존 방 반환
- `POST /api/rooms/:roomId/join`
- `POST /api/rooms/:roomId/start` — mode 선택, 문제 생성 트리거
- `POST /api/rooms/:roomId/answer` — 솔로 또는 멀티 제출
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
| Multi disconnect | Brief reconnect; else forfeit player, others continue |
| Empty school/hall | Client+server validation reject |
| Duplicate nickname | Auto suffix `_2`, `_3`, … |
| Room full (4 multi) | Join rejected with message |
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
