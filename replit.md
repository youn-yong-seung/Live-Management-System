# 윤자동 유튜브 라이브 CRM

## Overview

YouTube 라이브 방송 관리를 위한 CRM 웹 애플리케이션.
방문자가 라이브 스트림에 입장하거나 예약된 라이브에 신청할 수 있고,
지난 라이브를 다시보기 갤러리에서 무료로 열람할 수 있다.
신청 시 솔라피 카카오톡 알림톡이 자동 발송된다.
관리자는 라이브 일정과 신청자를 직접 관리한다.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Routing**: wouter
- **API Client**: Orval-generated React Query hooks
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **KakaoTalk notifications**: Solapi SDK (`solapi` npm package)
- **Build**: esbuild (CJS bundle)

## Artifacts

- `artifacts/live-crm` — React Vite 웹앱 (previewPath: `/`)
  - `/` 홈 대시보드 — 통계 카드, 진행 중인 라이브 입장 버튼
  - `/lives` 라이브 신청 — 예정 라이브 카드 + 신청 폼 모달
  - `/replays` 다시보기 갤러리 — 종료된 라이브 YouTube 임베드
  - `/admin` 관리자 — 라이브 CRUD + 신청자 목록
- `artifacts/api-server` — Express API 서버 (previewPath: `/api`)

## DB Schema (lib/db/src/schema)

- `lives`: id, title, description, youtubeUrl, scheduledAt, status(live/scheduled/ended), thumbnailUrl, createdAt
- `registrations`: id, liveId(FK), name, phone, email, message, createdAt

## API Endpoints

- `GET/POST /api/lives` — 라이브 목록/생성
- `GET/PUT/DELETE /api/lives/:id` — 단건 조회/수정/삭제
- `GET/POST /api/lives/:liveId/registrations` — 신청자 조회/등록
- `GET /api/dashboard-summary` — 대시보드 요약

## Environment Variables (Required for KakaoTalk notifications)

- `SOLAPI_API_KEY` — Solapi API Key
- `SOLAPI_API_SECRET` — Solapi API Secret
- `SOLAPI_SENDER_KEY` — 카카오톡 발신 프로필 키
- `SOLAPI_TEMPLATE_ID` — 알림톡 템플릿 코드
- `SOLAPI_SENDER_PHONE` — 발신 전화번호 (01x-xxxx-xxxx 형식 없이)
- `DATABASE_URL` — PostgreSQL 연결 문자열 (자동 설정)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/live-crm run dev` — run frontend locally
