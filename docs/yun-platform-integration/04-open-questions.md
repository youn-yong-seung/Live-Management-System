# 04. 미결 결정 / 다음 액션

> 작업이 막혀있는 이유와, 사용자에게 답을 받아야 할 결정. 답이 나오면 [03-decisions.md](./03-decisions.md)에 ADR로 봉인하고 여기서 삭제.

---

## ~~Q1. 인증 방식~~ → **해소** (ADR-005)
☑ Supabase Auth + Google OAuth. 명세는 [03-decisions.md ADR-005](./03-decisions.md#adr-005--인증-방식-supabase-auth--google-oauth).

## ~~Q2. DB 일원화~~ → **해소** (ADR-006)
☑ Live 자체 Supabase(`aadwlmcukaacqmiyoptc`) 유지. yun-platform Supabase는 Phase 5에서 별도 마이그. 명세는 [03-decisions.md ADR-006](./03-decisions.md#adr-006--db-live-자체-supabase-유지-옵션-a2).

---

## Q3. 첨부파일 / PDF 스토리지

**왜 결정해야 하나**: Phase 1C(자료실 DB화) + Phase 2A(커뮤니티 첨부) 둘 다 영향.

### 옵션
- (A) Supabase Storage — Auth와 같이 가면 일관성
- (B) Vercel Blob — 배포 호스트와 같으면 빠름, Auth와 분리
- (C) S3 호환 (Cloudflare R2 등) — 비용 ↓

### 추천
Q1/Q2 답이 Supabase 쪽이면 **(A) Supabase Storage**. 그렇지 않으면 **(B) Vercel Blob**.

### 사용자 답
☐ A (Supabase Storage)
☐ B (Vercel Blob)
☐ C (R2 / S3)

---

## Q4. yun-platform의 운영 데이터 현황

**왜 알아야 하나**: 마이그레이션 전략 + Phase 1 추천안에 영향. 사용자만 답할 수 있음.

### 알아야 할 것
- yun-platform 현재 가입자 수? (대략)
- 운영 중인 게시글 수?
- yun-platform이 지금 외부에 노출돼 있나? 노출돼 있다면 통합 중 어떻게 다룰지?
- 도메인이 이미 있나? (yunjadong.com? 별도?)
- 기존 가입자에게 통합 안내 / 데이터 이관 동의 받을 계획 있는지?

### 사용자 답
(여기에 답 적기)

---

## Q6. 커스텀 도메인 / yun-platform 도메인 전환 시점

**현재 상태**: ADR-007 Deferred. 사용자가 "도메인은 나중에, 우선 Live 기존 도메인 사용"으로 보류. Phase 5 진입 시 재검토.

---

## (이전 Q6 — 참고용으로 남김) 커스텀 도메인 — 언제 / 어떤 이름으로?

**왜 결정해야 하나**: ADR-007로 기본 도메인은 `yun-landing-dev.vercel.app`로 결정됐지만 이름에 `-dev`가 들어가 있어 production 도메인으로는 어색. 커스텀 도메인 전환 계획 여부에 따라:
- Google OAuth Redirect URI 셋업 횟수 (한 번 vs 두 번)
- 검색엔진 인덱스 / 사용자 북마크 / 메타태그 디자인 우선순위
- SSL 인증서 / DNS 설정 일정

### 옵션
- (A) 영영 `yun-landing-dev.vercel.app` 사용 — 커스텀 도메인 없음
- (B) `yunjadong.com` (메인 사이트와 통합) — 기존 yunjadong.com 운영 중인지 확인 필요
- (C) 별도 도메인 (`yunclass.com`, `yun-platform.kr` 등) — 신규 구매
- (D) Phase 1~5는 그대로 `yun-landing-dev` 쓰고 통합 후 커스텀 도메인 전환

### 추천 (Claude)
**(D)** — 통합 작업 중에는 도메인 신경 안 쓰고 기능에 집중, Phase 5 완료 후 사용자 가입자 안정화 시점에 커스텀 도메인으로 한 번에 전환. 그 시점에 OAuth redirect / 메타태그 / SEO 다 한 번에 정리.

### 사용자 답
☐ A / ☐ B / ☐ C / ☐ D

---

## Q5. 통합 작업 일정 / 담당

- 사용자 직접 작업 + Claude 페어 vs Claude가 풀 코딩?
- 한 주 작업 가능한 시간 대략?
- Phase 1만 먼저 끝내고 운영 검증 후 다음 단계로 갈지, 풀 스코프로 갈지?

### 사용자 답
(여기에 답 적기)

---

## 다음 액션 (Q1, Q2 답 받자마자 가능)

1. ADR-005 / ADR-006을 Accepted로 봉인 ([03-decisions.md](./03-decisions.md))
2. yun-platform `globals.css` / Tailwind 토큰 추출 → Live의 Tailwind config 업데이트
3. Phase 1A 시작 — 인증 모듈 도입
4. `users` 테이블 마이그 (Drizzle) — yun-platform `users_oauth` 스키마 참고
