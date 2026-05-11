# 03. 결정 로그 (ADR)

> Architecture Decision Record. 결정 바뀌면 새 ADR 추가, 기존 항목은 status만 `Superseded by ADR-N`으로 갱신.

---

## ADR-001 — 마스터 코드베이스: Live-Management-System

- **Status**: Accepted
- **Date**: 2026-05-11
- **Decided by**: 사용자

### Context
yun-platform과 Live-Management-System이 도메인 일부 중복 (자료실, 다시보기). 둘 중 하나에 통합해야 시너지 발생.

### Decision
**Live-Management-System을 마스터로 두고, yun-platform 기능을 이쪽으로 이식한다.**

### Reasons
- 코드량/도메인 깊이가 Live가 압도적 (admin CRUD, 폼빌더, 테크트리, 영상 공장, 카톡 알림톡 cron 등)
- Live는 매주 운영되는 라이브 데이터 + Solapi 알림톡 cron 자동화가 살아있음 → 이걸 옮기면 운영 공백 위험 ↑
- yun-platform은 비교적 stateless (Supabase에 데이터 의존 외엔 핵심 자동화 없음) → 들어내기 쉬움

### Consequences
- yun-platform의 Next.js SSR 코드는 React SPA + Express로 재이식 (직접 복사 불가)
- yun-platform의 Supabase RLS 정책 → Express 서버에서 권한 체크 로직으로 변환 필요
- 단, shadcn UI 컴포넌트 / TipTap / Vercel AI SDK 등은 직접 가져올 수 있음

---

## ADR-002 — 디자인 통합은 Phase 4로 미룸. 단, 디자인 토큰만 Phase 1A에서 통일

- **Status**: Accepted
- **Date**: 2026-05-11
- **Decided by**: 사용자(디자인은 나중) + Claude(토큰만 미리 통일하자는 강한 권고)

### Context
사용자 의견: "yun-platform 디자인이 더 예쁘니 나중에 그쪽으로 교체"
Claude 우려: 디자인을 통째로 마지막에 바꾸면 모든 페이지를 두 번 손대야 함 → 비용 폭발

### Decision
- **기능 이식이 우선**, 디자인 컴포넌트 레이아웃은 Phase 4까지 미룸
- **단, Tailwind 토큰 / CSS 변수 (color, font, radius, shadow)만 Phase 1A에서 yun-platform 값으로 통일**

### Consequences
- Phase 1~3 동안 페이지를 그릴 때마다 색/폰트는 이미 yun-platform 톤이라 Phase 4에서 다시 손댈 영역이 줄어듦
- Phase 4는 컴포넌트 레이아웃 / 여백 / 타이포 위계 / 카드 디자인 위주 작업으로 축소

---

## ADR-003 — 유입 깔때기를 1순위로 두고 Phase 재정렬

- **Status**: Accepted
- **Date**: 2026-05-11
- **Decided by**: 사용자(유입이 첫 관문) + Claude(Phase 재정렬 제안)

### Context
사용자 비전의 핵심 KPI: "매주 라이브 신청자 100-200명 → 플랫폼 회원 전환".
원래 일반적인 이식 순서는 (인증) → (커뮤니티) → (자료실) → (랜딩) 이지만, 이렇게 가면 전환 깔때기가 Phase 후반에야 작동.

### Decision
**Phase 1을 "유입 깔때기"로 좁게 정의하고 우선 처리:**
1. Supabase Auth (또는 자체 인증) 도입
2. 라이브 신청 폼 → 매직링크 → 자동 회원 가입
3. 자료실 DB화 + 로그인 게이트

→ Phase 1 끝나는 순간부터 매주 100-200명이 플랫폼 회원으로 적립되기 시작.

### Consequences
- 커뮤니티 / B2B / AI 챗봇 등은 Phase 2~3로 밀림 (지금은 가입자만 쌓이고 머무를 콘텐츠 부족)
- 단, "라이브 신청 → 회원" 전환만 작동해도 비전의 80%는 시작됨

---

## ADR-004 — yun-platform 클론은 휘발성 위치(`/tmp`)에 둠

- **Status**: Accepted
- **Date**: 2026-05-11
- **Decided by**: Claude

### Context
yun-platform은 분석 / 코드 참조용으로만 필요. Live 레포 안에 넣으면 깃 충돌, 워크스페이스 어지럽힘.

### Decision
yun-platform은 분석 시점에만 `/tmp/yun-platform`로 clone. 영구 보관 X.

### Consequences
- 다음 세션에서 yun-platform 코드 봐야 하면 다시 clone 필요 (`git clone --depth 30 git@github.com:youn-yong-seung/yun-platform.git /tmp/yun-platform`)
- 분석 결과는 [01-system-comparison.md](./01-system-comparison.md)에 누적해서 다시 clone 안 해도 되도록

---

## ADR-005 — 인증 방식: Supabase Auth + Google OAuth

- **Status**: Accepted
- **Date**: 2026-05-11
- **Decided by**: 사용자 (Q1=A)

### Context
yun-platform과 통합 후 단일 가입 흐름 필요. 라이브 신청자 → 플랫폼 회원 전환이 비전의 1순위 KPI.

### Decision
**Supabase Auth + Google OAuth Provider**를 첫 인증 수단으로 도입. 매직링크는 다음 단계(Phase 1B).

### Reasons
- Live가 이미 Supabase Postgres(`aadwlmcukaacqmiyoptc`)를 쓰고 있어 Auth 활성화는 Supabase 콘솔 토글로 끝남
- Google OAuth는 Supabase 1차 지원 → Custom Provider 코드 0
- 매직링크/카카오 확장이 같은 SDK로 가능
- yun-platform의 `vrsdigsjtfnystgxmkvj` 가입자는 Phase 5에서 별도 마이그 (지금 통합 안 함)

### Consequences
- 기존 admin 토큰 인증(`adminSessionsTable` + `x-admin-token`)은 한동안 **병행 운영** → Google 로그인 실패 시 운영자가 admin에서 잠금당하는 사고 방지
- `users` 테이블 신규 (Drizzle 스키마). `id`는 Supabase `auth.users.id`와 동일 (uuid)
- 첫 admin = `yunjadong101@gmail.com`. sync 시점에 자동 `role='admin'` 부여
- yun-platform 기존 가입자는 Phase 5 통합 시점까지 Live에 다시 가입해야 함

---

## ADR-007 — 기본 도메인: yun-landing-dev.vercel.app (기존 yun-platform Vercel 프로젝트 재활용)

- **Status**: Deferred (2026-05-11) — 사용자가 "도메인은 나중에, 우선 Live 기존 도메인 사용" 결정. Phase 5 진입 시 재검토.
- **Date**: 2026-05-11
- **Decided by**: 사용자

### Context
통합 후 단일 도메인 운영 필요. 라이브 시스템(Live-Management-System)의 현재 Vercel 도메인을 버리고 yun-platform 도메인으로 통합하기로 결정.

### Decision
- **기본 도메인**: `yun-landing-dev.vercel.app`
- **재활용 자원**: 기존 yun-platform Vercel 프로젝트(`yun-landing-dev`, 팀 `ceo-yunjadongcos-projects`)
- Phase 5 시점에 이 Vercel 프로젝트의 빌드 타깃을 Live-Management-System 코드로 교체. 즉:
  - 기존 yun-platform Next.js 빌드 설정 → Live의 monorepo + `vercel.json` 빌드 설정으로 교체
  - 환경변수(Supabase, Google OAuth, SESSION_SECRET 등)는 그대로 활용
  - 도메인은 자동 유지 (Vercel 프로젝트 = 도메인 매핑이라 코드만 바뀜)

### Reasons
- yun-platform Vercel 프로젝트에 이미 셋업된 자원(env, OAuth redirect, Supabase 연결)을 재활용 → Phase 1A 셋업 시간 ↓
- 도메인 그대로 유지 = 기존 yun-platform 가입자/북마크/검색 인덱스 보존
- 라이브 시스템의 기존 Vercel 도메인(있다면)은 301 리다이렉트로 흘려보냄

### Consequences
- yun-platform 코드는 깃 히스토리에만 남고, Vercel에서는 빌드되지 않음 → yun-platform 레포 archived 처리 가능 (Phase 5 산출물)
- Google OAuth Redirect URI 갱신 필요: 현재 `http://localhost:5555/api/auth/google/callback` → production은 `https://yun-landing-dev.vercel.app/api/auth/google/callback`. Live는 Express라서 라우트 경로 자체도 yun-platform Hono와 다를 수 있음 (Phase 1A에서 결정)
- Vercel 빌드 명령어 교체: `next build` → `pnpm --filter @workspace/live-crm run build && node artifacts/api-server/build-vercel.mjs`
- **이름의 `-dev` 뉘앙스 우려**: 엔드유저에게 보이는 production 도메인에 `-dev`가 들어감 → 별도 커스텀 도메인 결정은 [04-open-questions.md](./04-open-questions.md) Q6에서 추후 검토

---

## ADR-006 — DB: Live 자체 Supabase 유지 (옵션 A2)

- **Status**: Accepted
- **Date**: 2026-05-11
- **Decided by**: Claude 권장 + 사용자 묵시 OK (빠른 진행 시그널)

### Context
인증을 Supabase로 가면 DB도 어디 둘지 결정 필요. 작업 진행 중 발견: Live는 이미 자체 Supabase Postgres(`aadwlmcukaacqmiyoptc`)를 쓰는 중. yun-platform Supabase(`vrsdigsjtfnystgxmkvj`)와 다른 프로젝트.

### Decision
**Live의 자체 Supabase(`aadwlmcukaacqmiyoptc`)에서 Auth 활성화. yun-platform Supabase는 Phase 5에서 별도 마이그.**

### Reasons
- Live의 운영 데이터(lives, registrations, editors 등) 그대로 유지 → 운영 사고 위험 0
- Drizzle 스키마/마이그 흐름 그대로
- 같은 Supabase 안에서 `auth.users` ↔ Drizzle `users` 동기화는 트리거 또는 sync 라우트로 처리 가능
- Phase 5에 yun-platform 가입자 import는 별도 작업으로 분리

### Consequences
- yun-platform 가입자는 통합 시점(Phase 5)까지 Live에 다시 로그인해야 함 (한 번)
- Phase 5에 yun-platform `auth.users` export → Live Supabase `auth.users` import 또는 매직링크 일괄 발송으로 안내
- Live의 DATABASE_URL은 그대로 (변경 X)
- Supabase 콘솔에서 Google OAuth Provider 활성화 + Client ID/Secret 입력만 추가 (사용자 액션)
