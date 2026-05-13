# 02. 로드맵

> 단순 기능 이식 순서가 아니라 **유입 깔때기를 1순위**로 두고 정렬했음.
> 비전 근거: [00-context-and-vision.md](./00-context-and-vision.md)

---

## Phase 0 — 카톡방 유입 동선 시범 적용 ✅ 완료 (2026-05-11)

**목적**: yun-platform 통합 전, 라이브 시스템 단독으로 "무료 자료 → 카톡 대기방" 유입 동선이 작동하는지 검증.

- ✅ 첫 무료 PDF 자료실 등록 (`나노바나나 vs 덕테이프 프롬프트 가이드`)
- ✅ `/resources/nano-banana-vs-duct-tape` 랜딩 페이지 생성
- ✅ 다운로드 클릭 즉시 카톡 대기방 입장 모달 노출
- ✅ Hero / 다운로드 후 / 페이지 하단 — 카톡방 CTA 3중 배치
- ✅ Vite 빌드 통과 확인

**산출물**:
- `artifacts/live-crm/public/files/nano-banana-vs-duct-tape-guide-v1.pdf`
- `artifacts/live-crm/src/pages/free-guide-nano-banana.tsx`
- `artifacts/live-crm/src/pages/resources.tsx` (NEW 카드 추가)
- `artifacts/live-crm/src/App.tsx` (라우트 등록)

---

## Phase 1 — 유입 깔때기 (인증 + 자료실 게이트) ⏳ 설계 대기

> 비전의 80%가 이 한 단계로 작동 시작. 매주 100-200명 라이브 신청자가 자동으로 플랫폼 회원으로 적립됨.

### Phase 1A — 인증 & 디자인 토큰 통일
- [x] 인증 방식 확정 (ADR-005: Supabase Auth + Google OAuth)
- [x] DB 일원화 여부 확정 (ADR-006: Live 자체 Supabase 유지, 옵션 A2)
- [x] `users` 테이블 Drizzle 스키마 추가 (`lib/db/src/schema/users.ts`)
- [x] Supabase JWT 미들웨어 (Express): `requireUser`, `optionalUser`, `requireAdmin`
- [x] `/api/me`, `/api/auth/sync` 라우트
- [x] 프론트 Supabase Client + `AuthProvider` + `useAuth`
- [x] `/login` 페이지 (Google 버튼)
- [x] `/auth/callback` 라우트
- [x] Layout 헤더 — 로그인/프로필 드롭다운/로그아웃
- [x] 첫 admin seed (`yunjadong101@gmail.com` → sync 시점 자동 role=admin)
- [x] 타입체크 + Vite 빌드 + esbuild 통과
- [x] Supabase 콘솔 Google Provider 활성화 (사용자) — 2026-05-11
- [x] Google Cloud Console Redirect URI 등록 (사용자, OAuth Client `918556565954-jqe7po3n8h...`) — 2026-05-11
- [x] Supabase URL Configuration → Site URL + Redirect URLs 4개 — 2026-05-11
- [x] `.env` 키 5개 입력 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_*`) — 새 sb_publishable_/sb_secret_ 키 형식 사용
- [x] `.env`에 `PORT=3000` 추가 — api-server용
- [x] DB push — `users` 테이블 + `user_role` enum 생성 (drizzle-kit)
- [x] dev 서버 검증 — Google OAuth 로그인 → /auth/callback → /api/auth/sync → users 테이블에 yunjadong101@gmail.com이 role=admin으로 등록 → 헤더 프로필 드롭다운에 ADMIN 뱃지 노출. 라이브 신청 폼/자료실 회귀 없음.
- [x] **Production 배포 (2026-05-13)** — Vercel 프로젝트 `yunjadong-live-class` (팀: ceo-3736s-projects)에 환경변수 11개 등록, Supabase URL Configuration에 production URL 추가, `feat/phase1-auth` → main fast-forward 머지(27커밋), `https://yunjadong-live-class.vercel.app` 운영 반영. 사용자 검증: "잘 작동해"
- [ ] yun-platform 디자인 토큰 추출 (color/font/radius/shadow) — Phase 1A 잔여, 별도 작업으로 진행
- [ ] Live의 Tailwind config + globals.css에 토큰 이식 — 위와 같이

> **참고 — ADR-007과 실제 배포의 불일치**: ADR-007은 기존 yun-platform Vercel 프로젝트 `yun-landing-dev`를 재활용한다고 했지만, 실제 production은 별도 프로젝트 `yunjadong-live-class.vercel.app`로 운영 중. Phase 5에서 도메인 통합 시 yun-landing-dev로 합칠지, 아니면 yunjadong-live-class를 그대로 두고 yun-landing-dev에서 301 redirect할지 재결정 필요.

### Phase 1B — 신청 폼 → 자동 가입 깔때기
- [ ] 라이브 신청 시 등록 이메일로 매직링크 자동 발송
- [ ] 매직링크 클릭 → 플랫폼 계정 자동 생성 (이미 있으면 로그인)
- [ ] 신청자가 곧 회원이 되도록 `registrations.user_id` 컬럼 추가
- [ ] 솔라피 카톡 알림톡에 "플랫폼 가입 완료" 멘션 추가

### Phase 1C — 자료실 DB화 + 로그인 게이트
- [ ] `resources` 테이블 (yun-platform 스키마 참고: external_url 지원)
- [ ] 어드민에서 자료 CRUD (`/admin/resources`)
- [ ] 기존 정적 자료들(노션 템플릿 4종, PDF 가이드 등) DB로 이전
- [ ] 자료 다운로드 시 로그인 게이트 (비회원이면 가입 유도)
- [ ] Phase 0의 PDF 페이지를 DB 기반으로 리팩터

**완료 조건**: 라이브 신청 → 매직링크 → 회원 생성 → `/resources`에서 자료 다운로드까지 한 번도 막힘 없이 흐름.

---

## Phase 2 — 머무를 이유 (커뮤니티 + 다시보기 확장)

### Phase 2A — 커뮤니티 게시판 ✅ MVP 완료 (2026-05-11)
- [x] `community_posts`, `community_comments` 테이블 (Drizzle 스키마 + DB push)
- [x] TipTap 에디터 (`/community/new`, StarterKit + Placeholder + Link)
- [x] 게시글 목록 (`/community`) — 아바타·작성자·ADMIN뱃지·조회수·댓글수·상대시간
- [x] 게시글 상세 (`/community/:id`) — TipTap HTML 렌더, 본인/admin 삭제
- [x] 댓글 작성 + 삭제
- [x] 백엔드 API — GET/POST/DELETE posts, GET posts/:id (조회수 +1), POST/DELETE comments
- [x] 권한 — 본인 또는 admin만 글/댓글 삭제
- [x] 헤더 네비게이션에 "커뮤니티" 추가
- [x] 자동 회귀 검증 — 라이브 신청/cron/자료실 영향 0
- [ ] 첨부파일 업로드 (Vercel Blob 또는 Supabase Storage) — 후속
- [ ] 폴(투표) 기능 — 후속
- [ ] 대댓글 (parent_comment_id 컬럼은 있음, UI만 추가하면 됨) — 후속
- [ ] 링크프리뷰 (OG 메타 추출) — 후속

### Phase 1B — 유입 깔때기 진척
- [x] 1B-A 매직링크 인프라 → ❌ 폐기 (한국 UX 부적합 — 사용자 통찰). 코드 제거.
- [x] 1B-B-1 라이브 신청 완료 페이지 가입 유도 UI (2026-05-11) — Google 가입 버튼 + 회원 혜택 안내
- [x] 1B-B-2 registrations.user_id 컬럼 + 이메일 자동 매칭 (2026-05-12) — 신청 시 이메일로 user 찾으면 user_id 자동 채움 + 회원 가입 시 기존 신청 backfill
- [x] 1B-B-3 자료실 다운로드 로그인 게이트 (2026-05-12) — 파일 자료 클릭 시 비회원이면 가입 권유 모달 + "일단 비회원으로 받기" 옵션

### Phase 2B — 다시보기 클래스/레슨
- [ ] 기존 `replays` 페이지 확장 → 클래스(시리즈) → 레슨(개별 영상) 구조
- [ ] `replay_classes`, `replay_lessons` 테이블
- [ ] body_html (TipTap 출력) 저장 — 영상 + 부가 설명

---

## Phase 3 — 플랫폼화

- [ ] 강사 등록 / 프로필 페이지 — `users.role` 확장 또는 `instructors` 테이블
- [ ] B2B 의뢰 폼 (`/b2b-requests`) + 어드민 처리
- [ ] 뉴스레터 구독 (`newsletter_subscribers`)
- [ ] AI 챗봇 (Vercel AI SDK, 메인 화면 우측 하단 등)
- [ ] (장기) 결제 / 계약 — 별도 설계서 필요

---

## Phase 4 — 디자인 통합

> Phase 1A에서 토큰만 미리 통일해뒀기 때문에 이 단계는 컴포넌트 레이아웃 정비 위주.

- [ ] yun-platform 페이지 톤(여백/타이포 위계/카드 디자인) 적용
- [ ] 글래스 카드 → yun-platform 카드 스타일 비교 후 결정
- [ ] 모바일 디자인 점검
- [ ] 다크/라이트 테마 (next-themes 패턴 차용)

---

## Phase 5 — yun-platform 데이터 이관 + 종료

- [ ] yun-platform Supabase 데이터 export (users, posts, resources, b2b)
- [ ] Live DB로 import 스크립트
- [ ] yun-platform 도메인 → Live 도메인으로 301 리다이렉트
- [ ] yun-platform Vercel 배포 중단
- [ ] yun-platform 레포 archived 처리

---

## 진행 기록 룰

각 Phase 완료 시 이 파일에 다음 형식으로 기록:

```
### Phase X — 이름 ✅ 완료 (YYYY-MM-DD)
**산출물**: 핵심 파일 / 마이그 / PR 링크
**메모**: 의외였던 점 / 주의사항
```
