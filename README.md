# Selena — 중학 시험장 배틀

중학생이 **학교 이름 + 시험장 이름**으로 방에 들어가, 국어·영어·수학·과학 객관식 문제로 **솔로(vs AI)** 또는 **멀티 배틀**을 하는 웹 게임입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000

### AI 문제 생성 (선택)

`.env.local`:

```
XAI_API_KEY=your_key_here
```

키가 없거나 API가 실패하면 **내장 연습 문제(폴백)** 로 바로 플레이합니다.

## 플레이 방법

1. **시험장 만들기** 또는 **입장**
2. 학교 이름, 시험장 이름, 닉네임, 과목 (만들 때 난이도) 입력
3. 대기실에서 호스트가 시작  
   - 1명 → 솔로 (HP 3 vs AI)  
   - 2~4명 → 멀티 (정답 + 속도 점수)
4. 문항당 20초, 해설 후 다음 문제

## 개발

```bash
npm test        # 단위 테스트
npm run test:e2e  # Playwright (솔로 플로우)
npm run build
```

방 상태는 **SQLite** (`.data/selena.sqlite`)에 저장됩니다.  
경로 변경: `SELENA_DB_PATH=/path/to/file.sqlite`  
테스트는 `:memory:` 또는 임시 파일을 씁니다.

## 구조

- `src/lib/` — 방·배틀·문제 생성 (서버 권위)
- `src/app/api/rooms/` — REST + SSE
- `src/app/page.tsx` — 홈
- `src/app/room/[roomId]/page.tsx` — 로비/배틀/결과

방은 **프로세스 메모리**에 저장됩니다. 서버를 재시작하면 방이 사라집니다.

## 스펙

- 설계: `docs/superpowers/specs/2026-07-17-selena-exam-battle-design.md`
- 구현 계획: `docs/superpowers/plans/2026-07-17-selena-exam-battle.md`
