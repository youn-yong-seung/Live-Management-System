# yun-platform → Live-Management-System 통합 작업

> **목적**: yun-platform(Next.js+Supabase)의 핵심 기능을 Live-Management-System(이 레포)으로 흡수해 단일 플랫폼으로 통합. 매주 라이브 신청자 100-200명을 플랫폼 회원으로 자동 전환시키는 깔때기 구축이 1순위.

## 현재 상태 (2026-05-11 기준)

- **방향 결정 완료**: Live가 마스터, yun-platform → Live로 이식 (반대 방향 X) — ADR-001
- **Phase 0 완료**: 자료실 첫 PDF (`나노바나나 vs 덕테이프 가이드`) + 카톡 대기방 유입 모달 구축 — `/resources/nano-banana-vs-duct-tape`
- **인프라 결정 완료** (2026-05-11):
  - 인증: Supabase Auth + Google OAuth (ADR-005 Accepted)
  - DB: Live 자체 Supabase(`aadwlmcukaacqmiyoptc`) 유지 (ADR-006 Accepted, 옵션 A2)
  - 도메인: ADR-007 **Deferred** — 사용자가 Live 기존 도메인 그대로 사용. Phase 5 진입 시 재검토
  - yun-platform Supabase(`vrsdigsjtfnystgxmkvj`)는 Phase 5에서 별도 마이그
  - OAuth: 구글만 운영 → R1 해소, R16(전환율 우려) 신규
- **Phase 1A 구글 로그인 완료** (2026-05-11): 코드 + 외부 콘솔 + DB 마이그 + dev 검증 모두 통과. yunjadong101@gmail.com이 첫 admin으로 등록됨. 라이브 신청/자료실 회귀 없음.
- **현재 진행중**: Phase 1A 잔여 — 디자인 토큰 추출 (yun-platform → Live)
- **다음 마일스톤**: Phase 1B (매직링크 + 라이브 신청 폼 → 자동 가입 깔때기), Phase 1C (자료실 DB화 + 로그인 게이트)

## 문서 구조

| 파일 | 내용 | 언제 보나 |
|---|---|---|
| [00-context-and-vision.md](./00-context-and-vision.md) | 비전 / 배경 / 사용자 원문 | 처음 합류 시 |
| [01-system-comparison.md](./01-system-comparison.md) | 두 시스템 스택·구조 비교 | 어떤 코드가 어디 있는지 찾을 때 |
| [02-roadmap.md](./02-roadmap.md) | Phase 0-4 로드맵 | 무엇을 할지 |
| [03-decisions.md](./03-decisions.md) | 결정 로그 (ADR) | 왜 이렇게 정했는지 |
| [04-open-questions.md](./04-open-questions.md) | 미결 결정 + 다음 액션 | 지금 막힌 게 뭔지 |
| [05-risks-and-concerns.md](./05-risks-and-concerns.md) | 리스크 매트릭스 + 완화 전략 | Phase 1 시작 **전** 반드시 |

## 빠른 따라잡기 (3분)

1. [00-context-and-vision.md](./00-context-and-vision.md) — 비전 한 번 읽고
2. [04-open-questions.md](./04-open-questions.md) — 막힌 결정이 뭔지 확인
3. [02-roadmap.md](./02-roadmap.md) — 어디까지 했고 다음이 뭔지

## 핸드오프 룰

- 의사결정 바뀌면 [03-decisions.md](./03-decisions.md)에 새 항목 추가 (기존 항목 수정 X, "superseded by ADR-N" 표기)
- Phase가 끝나면 [02-roadmap.md](./02-roadmap.md)에 체크 + 결과 요약 1-2줄
- 문서 전체 본문에는 절대 비밀정보(토큰/키/비번) 박지 말 것 — `.env.example`만 갱신
