# Selena 배포 가이드 (P1)

이 앱은 **SQLite 단일 파일**로 방 상태를 저장합니다.  
→ **한 대의 서버 프로세스**에서 돌리는 것이 맞습니다.  
(서버리스 다중 인스턴스 / Vercel 기본 배포는 방 공유·SSE에 맞지 않습니다.)

## GitHub Actions (자동)

`main` 푸시 시:

1. **CI** — 단위 테스트, 프로덕션 빌드, Playwright E2E  
2. **Deploy** — Docker 이미지를 `ghcr.io/dobuzi/selena` 에 게시  

### 이미지 실행 (VPS / 로컬)

```bash
# 패키지가 Private이면: gh auth token | docker login ghcr.io -u USER --password-stdin
docker pull ghcr.io/dobuzi/selena:latest
docker run -d --name selena --restart unless-stopped \
  -p 3000:3000 \
  -v selena_data:/data \
  ghcr.io/dobuzi/selena:latest
```

### (선택) SSH 자동 배포

Repo → Settings → Secrets and variables:

| 이름 | 종류 | 설명 |
|------|------|------|
| `DEPLOY_HOST` | Secret | 서버 IP/호스트 |
| `DEPLOY_USER` | Secret | SSH 사용자 |
| `DEPLOY_SSH_KEY` | Secret | private key |
| `DEPLOY_PORT` | Secret | 기본 22 |
| `XAI_API_KEY` | Secret | (선택) AI 키 |
| `ENABLE_SSH_DEPLOY` | **Variable** | `true` 일 때만 SSH job 실행 |

Packages 가 private 이면 서버에서 `docker login ghcr.io` 가 필요합니다.

## 권장 아키텍처

```
[iPhone/iPad Safari]
        │ HTTPS
        ▼
[리버스 프록시 / CDN]  ← Cloudflare Tunnel, Caddy, nginx, Fly proxy
        │
        ▼
[단일 Node 컨테이너]  next start :3000
        │
        ▼
[/data/selena.sqlite]  영구 볼륨
```

| 방식 | 난이도 | HTTPS | 적합한 경우 |
|------|--------|-------|-------------|
| **Docker + VPS** (권장) | 중 | Caddy/nginx 또는 Cloudflare | 학교·친구에게 장기 링크 |
| **Cloudflare Tunnel** | 하 | 자동 | 집/교실 PC를 임시 공개 |
| **ngrok** | 하 | 자동 | 데모 5분 |
| Fly.io / Railway | 중 | 자동 | 클라우드 단일 머신 |
| Vercel Serverless | — | O | **비권장** (SQLite·SSE·인메모리 한계) |

---

## A. Docker (로컬 검증 → 그대로 VPS)

### 사전 요구
- Docker / Docker Compose

### 실행

```bash
cd .worktrees/selena-exam-battle   # 또는 레포 루트
docker compose up --build -d
```

- 앱: http://localhost:3000  
- DB: 볼륨 `selena_data` → 컨테이너 `/data/selena.sqlite`

AI 사용 시:

```bash
echo 'XAI_API_KEY=xai-...' > .env
docker compose up --build -d
```

중지:

```bash
docker compose down
```

---

## B. 공개 HTTPS URL — 빠른 데모

### 1) Cloudflare Tunnel (추천, 무료 계정)

맥/VPS에서 앱이 `localhost:3000`으로 떠 있는 상태에서:

```bash
# cloudflared 설치 후
cloudflared tunnel --url http://localhost:3000
```

출력되는 `https://….trycloudflare.com` 링크를 아이폰에 공유합니다.

고정 도메인이 필요하면 Cloudflare Zero Trust에서 named tunnel + 본인 도메인을 연결합니다.

### 2) ngrok

```bash
ngrok http 3000
```

`https://….ngrok-free.app` 사용. 무료 플랜은 브라우저 경고 페이지가 있을 수 있습니다.

### 3) 같은 Wi‑Fi만 (HTTPS 없음)

```bash
# 맥 IP 확인
ipconfig getifaddr en0
npm run dev -- -H 0.0.0.0
# 아이폰 Safari: http://192.168.x.x:3000
```

사파리 일부 기능·PWA는 HTTPS가 더 안전합니다. **외부/교실 공용은 Tunnel 권장.**

---

## C. VPS 한 대 (Ubuntu 예시)

```bash
# 1) 코드 배포
git clone <repo> && cd selena
# worktree를 쓰 중이면 feature 브랜치를 메인에 머지한 뒤 클론

# 2) Docker
docker compose up --build -d

# 3) HTTPS — Caddy 예시 (도메인 준비 시)
# Caddyfile:
#   selena.example.com {
#     reverse_proxy localhost:3000
#   }
```

방화벽: `80/443` 개방. DB 백업: 볼륨 또는 `/var/lib/docker/volumes/.../selena.sqlite` 복사.

---

## D. Fly.io (단일 머신 + 볼륨)

개념만 요약합니다. 상세는 [Fly docs](https://fly.io/docs/) 참고.

1. `fly launch` (Docker 사용)
2. 볼륨 생성 후 `SELENA_DB_PATH=/data/selena.sqlite` 마운트
3. **인스턴스 수 = 1** 고정 (스케일 아웃 금지)
4. HTTPS는 Fly 기본 제공

Railway도 동일하게 **단일 서비스 + 영구 디스크**면 가능합니다.

---

## 환경 변수

| 변수 | 설명 | 기본 |
|------|------|------|
| `PORT` | HTTP 포트 | `3000` |
| `SELENA_DB_PATH` | SQLite 파일 경로 | 로컬 `.data/selena.sqlite`, Docker `/data/selena.sqlite` |
| `XAI_API_KEY` | SpaceXAI 문제 생성 | 없으면 폴백 문제 |

---

## 체크리스트 (배포 후)

- [ ] 홈 로드, 개발자 이름 표시
- [ ] 시험장 만들기 → 솔로 1판
- [ ] 두 기기에서 같은 학교·시험장 입장 → 멀티 시작
- [ ] 서버 재시작 후에도 방/DB가 유지되는지 (볼륨 확인)
- [ ] HTTPS URL로 아이폰 Safari 접속

---

## 왜 Vercel 단독 배포가 어려운가

1. **SQLite 파일** — 서버리스 파일시스템은 휘발·인스턴스별 분리  
2. **SSE** — 장시간 연결에 제한  
3. **방 상태** — 여러 람다 인스턴스 간 공유 없음  

공개가 필요하면 **한 컨테이너 + Tunnel/VPS**를 쓰면 됩니다.
