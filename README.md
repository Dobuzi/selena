# Selena — 중학 시험장 배틀

중학생이 **학교 이름 + 시험장 이름**으로 방에 들어가, 국어·영어·수학·과학 객관식 문제로 **솔로(vs AI)** 또는 **멀티 배틀**을 하는 웹 게임입니다.

**개발:** 빛가온 초등학교 1학년 1반 김도아

## 실행 (개발)

```bash
npm install
npm run dev
```

브라우저: http://localhost:3000  
같은 Wi‑Fi 아이폰: `npm run dev -- -H 0.0.0.0` 후 `http://<맥IP>:3000`

### AI 문제 생성 (선택)

`.env.local`:

```
XAI_API_KEY=your_key_here
```

키가 없거나 API가 실패하면 **내장 연습 문제(폴백)** 로 플레이합니다.

## 플레이

1. **시험장 만들기** 또는 **입장**
2. 학교 이름, 시험장 이름, 닉네임, 과목 (만들 때 난이도)
3. 대기실에서 호스트가 시작  
   - 1명 → 솔로 (HP 3 vs AI)  
   - 2~4명 → 멀티 (정답 + 속도 점수)
4. 문항당 20초, 해설 후 다음 문제

## 테스트

```bash
npm test          # 단위 테스트
npm run test:e2e  # Playwright (솔로 + 멀티 2인)
npm run build
```

## Docker (프로덕션형 단일 호스트)

```bash
docker compose up --build -d
# http://localhost:3000
```

방 데이터는 Docker 볼륨에 SQLite로 저장됩니다.

## 공개 HTTPS / 배포

상세: **[docs/deploy.md](docs/deploy.md)**

요약:
- **데모:** Cloudflare Tunnel 또는 ngrok → `localhost:3000` 노출
- **상시:** Docker + VPS (또는 Fly/Railway 단일 머신 + 볼륨)
- **비권장:** Vercel 서버리스 단독 (SQLite·SSE 한계)

## 구조

| 경로 | 역할 |
|------|------|
| `src/lib/` | 방·배틀·문제 (서버 권위) |
| `src/app/api/rooms/` | REST + SSE + heartbeat |
| `src/app/page.tsx` | 홈 |
| `src/app/room/[roomId]/` | 로비/배틀/결과 |
| `.data/selena.sqlite` | 로컬 SQLite (gitignore) |

`SELENA_DB_PATH`로 DB 경로를 바꿀 수 있습니다.

## 스펙

- 설계: `docs/superpowers/specs/2026-07-17-selena-exam-battle-design.md`
- 구현 계획: `docs/superpowers/plans/2026-07-17-selena-exam-battle.md`
