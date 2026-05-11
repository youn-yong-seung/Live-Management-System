# 01. 두 시스템 비교

## yun-platform 인프라 (env.local 분석 결과 — 2026-05-11)

> 시크릿 값은 절대 이 문서에 적지 않음. 운영자만 env.local 또는 `~/.envs/yun-platform.env.local` 같은 안전 위치에서 관리.

| 항목 | 값 |
|---|---|
| Vercel 팀 | `ceo-yunjadongcos-projects` |
| Vercel 프로젝트명 | `yun-landing-dev` |
| 기본 도메인 (ADR-007) | `yun-landing-dev.vercel.app` |
| Supabase URL | `https://vrsdigsjtfnystgxmkvj.supabase.co` |
| Supabase Project Ref | `vrsdigsjtfnystgxmkvj` |
| Google OAuth Client ID | `918556565954-jqe7po3n8heujin989qthhhnliljofqj.apps.googleusercontent.com` |
| Google Cloud 프로젝트 (콘솔 화면) | `test-cb718` |
| 현재 Google OAuth Redirect URI | `http://localhost:5555/api/auth/google/callback` (dev) → Phase 1A에서 production용 갱신 필요 |
| 카카오/네이버 OAuth | **미구성** (관련 키 없음) |
| 메일 발송 / SMTP | env.local에 없음 → Supabase 내장 발송 또는 미설정 (확인 필요) |
| 자체 세션 | `SESSION_SECRET` 존재 → Supabase Auth + Express 세션 하이브리드 가능성 |
| AI Provider 기본값 | Google Gemini 2.5 Flash (`GOOGLE_GENERATIVE_AI_API_KEY` placeholder) |
| Dev 포트 | 5555 |
| 빌드 시스템 | Turborepo (`TURBO_*` env 다수) — package.json은 단순 next 앱 |

---

## 한눈에

| 영역 | Live-Management-System (마스터) | yun-platform (이식 대상) |
|---|---|---|
| 프레임워크 | Vite + React 18 SPA | Next.js 16 App Router (SSR) |
| API | Express 5 (`artifacts/api-server`) | Hono on Next route handler (`/api/[[...route]]`) |
| DB | PostgreSQL + Drizzle ORM | Supabase (Postgres + RLS + Edge Functions) |
| 인증 | **없음** | Supabase Auth (OAuth만) |
| 라우팅 | wouter | Next App Router |
| UI | shadcn/ui + Radix | shadcn + base-ui |
| 스타일 | Tailwind v3 + 커스텀 글래스 카드 | Tailwind v4 |
| 폼 / 검증 | drizzle-zod (zod v3 호환 이슈 있음) | react-hook-form + zod v3 |
| 에디터 | 없음 | TipTap (이미지/링크/언더라인/플레이스홀더) |
| AI | 없음 | Vercel AI SDK 멀티프로바이더 (Gemini/Claude/OpenAI/Groq/Ollama) |
| 패키지 매니저 | pnpm 워크스페이스 | npm |
| 배포 | Vercel | Vercel |
| 알림 | Solapi 카카오 알림톡 (cron 구동) | 없음 |
| 테스트 | (미정/없음) | Playwright + Vitest |

## Live-Management-System 페이지

```
/                        홈 — 통계, 진행중 라이브, 무료자료, 추천 다시보기
/lives                   라이브 신청 (예정 라이브 카드 + 폼)
/lives/:id/register      독립 레이아웃 신청 페이지
/lives/:id/dashboard     라이브 대시보드 (방장용)
/lives/:id/after         라이브 후기 / 카톡방 안내
/lives/:id/review        후기 페이지
/replays                 다시보기 갤러리
/courses                 유료 강의
/resources               무료 자료 (정적 카드)
/resources/nano-banana-vs-duct-tape   PDF 다운로드 랜딩 (Phase 0 산출물)
/techtree                테크트리
/video-factory           영상 공장
/video-factory/:id       영상 공장 상세
/admin                   관리자 (라이브 CRUD, 신청자, 에디터, 폼빌더, 테크트리, 캘린더)
/editor                  에디터 포털
```

## yun-platform 페이지 (이식 후보)

```
(landing) 그룹 — 공개
├─ /                     랜딩
├─ /community            게시판 (TipTap 글, 폴, 첨부, 링크프리뷰, 댓글답글)
├─ /community/[id]
├─ /community/new
├─ /replays              다시보기 (클래스 → 레슨 구조)
├─ /replays/[id]
├─ /resources            자료실 (DB 기반, 외부URL 지원)
├─ /b2b-requests         B2B 의뢰 폼
└─ /profile              프로필

dashboard 그룹 — 관리자
├─ /dashboard/users
├─ /dashboard/community
├─ /dashboard/replays
├─ /dashboard/resources
├─ /dashboard/b2b-requests
├─ /dashboard/logs
└─ /dashboard/profile

/login                   OAuth 로그인
```

## DB 스키마 비교

### Live (Drizzle)

- `lives` — id, title, description, youtubeUrl, scheduledAt, status, thumbnailUrl, createdAt
- `registrations` — id, liveId(FK), name, phone, email, message, createdAt
- (그 외 — `lib/db/src/schema` 풀 스캔 필요)

### yun-platform (Supabase 마이그 19개)

```
20260416174651  init
20260416174652  admin_seed
20260421000000  users_oauth
20260421120000  users_oauth_only
20260421130000  users_drop_deleted_at
20260421140000  community_board
20260421141000  users_add_phone
20260421142000  resources
20260421150000  resources_overhaul
20260421150500  community_attachments
20260422120000  comment_replies
20260422130000  post_html_body
20260422140000  community_replays
20260422150000  resources_external_url
20260423120000  b2b_requests
20260423120001  newsletter_subscribers
20260424120000  community_post_polls
20260427120000  replays_classes_lessons
20260429120000  replays_body_html
```

→ 핵심 테이블: `users`, `community_posts`, `community_attachments`, `community_post_polls`, `comment_replies`, `resources`, `b2b_requests`, `newsletter_subscribers`, `replay_classes`, `replay_lessons`

## 이식 난이도 (대략)

| 항목 | 난이도 | 비고 |
|---|---|---|
| 디자인 토큰 추출 (Tailwind/CSS 변수) | ★☆☆ | yun-platform globals.css 복사 + 매핑 |
| shadcn UI 컴포넌트 | ★☆☆ | 둘 다 shadcn — 거의 호환 |
| TipTap 에디터 | ★☆☆ | React 라이브러리 — 그대로 |
| 자료실 (정적 → DB 기반) | ★★☆ | 스키마 + 어드민 CRUD |
| 커뮤니티 (글/폴/첨부/링크프리뷰) | ★★★ | TipTap + 첨부 스토리지 + 폴 로직 + RLS |
| Supabase Auth 도입 | ★★★ | 라이브 신청 폼과 연결, RLS 정책, 세션 관리 |
| Hono → Express 라우트 재이식 | ★★☆ | 핸들러 시그니처 비슷 |
| AI 챗봇 | ★★☆ | Vercel AI SDK는 Express에서도 동작 |
| 다시보기 클래스/레슨 구조 | ★★☆ | 기존 `lives`/`replays` 확장 |
| B2B 의뢰 + 뉴스레터 | ★☆☆ | 단순 폼 + DB |
| 데이터 마이그레이션 (yun-platform 기존 유저/글) | ★★★ | 운영 데이터 있으면 SQL 마이그 스크립트 필요 |
