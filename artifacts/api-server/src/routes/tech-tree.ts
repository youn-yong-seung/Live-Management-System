import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { techTreeConfigTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAdminAuth } from "../middleware/adminAuth";

const router: IRouter = Router();

/* ── 기본 시드 데이터 ───────────────────────────────────
   DB에 한 번도 저장된 적이 없을 때 첫 GET 시 자동 시드.
   하드코딩이지만 어드민에서 편집하면 DB에 PUT되어 이후엔 DB가 권위.
─────────────────────────────────────────────────────── */
const DEFAULT_PATHS = [
  {
    id: "notion",
    name: "노션 마스터",
    emoji: "📝",
    description: "노션 왕초보에서 업무 시스템 구축까지",
    color: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.3)",
    nodes: [
      { id: "n1", liveId: 10, level: "Lv.1 입문", title: "노션 포기자를 위한 초특급 쉬운 설명회", shortTitle: "노션 입문", description: "노션을 포기했던 분들을 위한 초특급 쉬운 설명회", youtubeUrl: "https://www.youtube.com/watch?v=7IIynOrHJc4", tags: ["노션", "입문"], gains: ["노션 기본 개념 이해", "페이지 만들기", "블록 사용법"], children: ["n2"] },
      { id: "n2", liveId: 18, level: "Lv.2 기초", title: "프락과 함께하는 노션 할 일 관리 설명회", shortTitle: "할 일 관리", description: "신입사원 프락이 직접 알려주는 노션 할 일 관리 시스템", youtubeUrl: "https://www.youtube.com/watch?v=yy5tW_zRAaM", tags: ["노션", "생산성"], gains: ["할 일 관리 시스템 구축", "체크박스/캘린더 활용", "일일 루틴 관리"], children: ["n3"] },
      { id: "n3", liveId: 11, level: "Lv.3 중급", title: "노션 데이터베이스 — 넌 이제 내꺼야!", shortTitle: "데이터베이스", description: "노션 데이터베이스를 완벽하게 마스터", youtubeUrl: "https://www.youtube.com/watch?v=3b9_4gY8pLw", tags: ["노션", "데이터베이스"], gains: ["DB 생성/관리", "필터/정렬 마스터", "관계형 데이터 연결"], children: ["n4", "n5"] },
      { id: "n4", liveId: 12, level: "Lv.4 실전", title: "노션으로 만드는 직원 급여 관리 시스템", shortTitle: "급여 시스템", description: "노션으로 직원 급여 관리 시스템을 만드는 무료 특강", youtubeUrl: "https://www.youtube.com/watch?v=30r5T0T2JkQ", tags: ["노션", "시스템"], gains: ["실전 업무 시스템", "자동 계산 수식", "팀 운영 노하우"], children: ["n6"] },
      { id: "n5", liveId: 49, level: "Lv.4 지식관리", title: "옵시디언으로 두 번째 뇌를 만드는 남자 — 구요한님", shortTitle: "옵시디언", description: "지식관리 전문가 구요한님의 옵시디언 활용법", youtubeUrl: "https://www.youtube.com/watch?v=-bO_J3fD4Jc", tags: ["생산성", "노션"], gains: ["옵시디언 활용법", "지식 관리 시스템", "세컨드 브레인 구축"] },
      { id: "n6", liveId: 7, level: "Lv.5 고급", title: "Notion + Replit 업무 효율 200% 시스템", shortTitle: "노션+코딩", description: "윤자동 X 노션다움 — Notion + Replit 연동 시스템", youtubeUrl: "https://www.youtube.com/watch?v=OHIubNDuJ1I", tags: ["노션", "자동화"], gains: ["노션+코드 연동", "자동화 시스템 구축", "200% 업무 효율"] },
    ],
  },
  {
    id: "claude",
    name: "바이브코딩",
    emoji: "🤖",
    description: "내게 맞는 도구로 코딩 시작 → 마스터까지",
    color: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.3)",
    nodes: [
      { id: "vc0", liveId: 0, level: "Lv.0 시작", title: "바이브코딩 시작 — 도구 선택", shortTitle: "도구 선택", description: "Cursor / Claude Code / Replit 중 자신에게 맞는 도구를 골라 시작하세요", youtubeUrl: "", tags: ["바이브코딩", "입문"], gains: ["도구별 특징 이해", "내 상황에 맞는 도구 선택", "학습 로드맵"], children: ["cur1", "cc1", "rep1"] },
      { id: "cur1", tool: "커서", liveId: 15, level: "Lv.1 커서", title: "커서AI 설치부터 기본사용법까지", shortTitle: "커서AI", description: "Cursor AI 설치 및 기본 사용법 튜토리얼", youtubeUrl: "https://www.youtube.com/watch?v=vOn9S4zh1Qs", tags: ["커서", "AI 코딩"], gains: ["Cursor 설치", "기본 사용법", "AI 코딩 보조 활용"] },
      { id: "cc1", tool: "클로드코드", liveId: 32, level: "Lv.1 설치", title: "클로드코드 설치 & 사용법 완벽정리", shortTitle: "설치", description: "Claude Code 설치부터 기본 명령어, 환경 세팅까지", youtubeUrl: "https://www.youtube.com/watch?v=9XHXmQ3_6Sw", tags: ["클로드코드", "설치"], gains: ["Claude Code 설치", "기본 명령어", "환경 세팅"], children: ["cc2"] },
      { id: "cc2", liveId: 5, level: "Lv.2 API 연동", title: "Claude Code 기초편 — API 키 연동부터 시작", shortTitle: "API 연동", description: "API 키 발급, 인증 연동, 첫 워크플로 만들기", youtubeUrl: "https://www.youtube.com/watch?v=L75Sa_mukpM", tags: ["클로드코드", "API"], gains: ["API 키 발급/연동", "기초 워크플로", "프롬프트 기초"], children: ["cc3"] },
      { id: "cc3", liveId: 67, level: "Lv.3 초중급", title: "클로드코드 - 초중급자편 (권오서 강사)", shortTitle: "클로드코드 - 초중급자편", description: "권오서 강사님과 함께하는 클로드코드 실무 자동화", youtubeUrl: "https://youtube.com/live/19xW4hA3AVs?feature=share", tags: ["클로드코드", "자동화"], gains: ["실무 자동화 사례", "워크플로 설계", "현업 적용 노하우"], children: ["cc4"] },
      { id: "cc4", liveId: 66, level: "Lv.4 중상급", title: "클로드코드 - 중상급자편 (지피타쿠)", shortTitle: "클로드코드 - 중상급자편", description: "지피타쿠님의 고수 워크플로 + 바로 쓸 수 있는 자료 공개", youtubeUrl: "https://www.youtube.com/watch?v=qYSNj2TmfZc", tags: ["클로드코드", "고수"], gains: ["고수 워크플로", "실전 자료 수령", "심화 활용법"] },
      { id: "rep1", tool: "레플릿", liveId: 54, level: "Lv.1 마스터", title: "윤자동 바이브코딩 유료급 라이브 강의 (Replit)", shortTitle: "바이브 마스터", description: "Replit으로 만드는 바이브코딩 — 유료급 무료 라이브", youtubeUrl: "https://www.youtube.com/watch?v=qInwRkvvGas", tags: ["레플릿", "바이브코딩"], gains: ["Replit 활용 바이브코딩", "실전 프로젝트 제작", "AI 개발 자립"] },
    ],
  },
  {
    id: "business",
    name: "사업가",
    emoji: "💼",
    description: "마케팅 기초에서 수익화까지",
    color: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.3)",
    nodes: [
      { id: "b1", liveId: 4, level: "Lv.1 입문", title: "마케팅 / 고객관리 기초편", shortTitle: "마케팅 기초", description: "마케팅과 고객관리의 기초를 배우는 라이브", youtubeUrl: "https://www.youtube.com/live/9tCmu_E4RdY", tags: ["마케팅", "고객관리"], gains: ["마케팅 기본 개념", "CRM 이해", "고객 관리 전략"], children: ["b2", "b3"] },
      { id: "b2", liveId: 30, level: "Lv.2 실전", title: "고객관리 실전편 — 병의원 사례로 배우는 AI 활용법", shortTitle: "CRM 실전", description: "CRM과 Replit을 활용한 병의원 고객관리 실전 사례", youtubeUrl: "https://www.youtube.com/watch?v=Efiy7x-lYBA", tags: ["마케팅", "AI"], gains: ["실전 CRM 구축", "AI 고객관리 활용", "업종별 전략"], children: ["b5"] },
      { id: "b3", liveId: 21, level: "Lv.2 전략", title: "3억 매출 마자이너의 차별화 전략", shortTitle: "차별화 전략", description: "김찬섭 대표님 인터뷰 — 디자인+마케팅 결합 전략", youtubeUrl: "https://www.youtube.com/watch?v=ErgYbRFHM08", tags: ["마케팅", "사업"], gains: ["차별화 전략 수립", "디자인+마케팅 결합", "매출 성장 노하우"], children: ["b4"] },
      { id: "b4", liveId: 41, level: "Lv.3 스케일업", title: "혼자서 사업을 4개나 굴리는 비결 — 신영선님", shortTitle: "다중 사업", description: "1인 다중 사업가 신영선님의 비결 인터뷰", youtubeUrl: "https://www.youtube.com/watch?v=ZVGY6IaAb9U", tags: ["사업", "인터뷰"], gains: ["다중 사업 운영법", "시스템화 전략", "자동화로 시간 확보"], children: ["b6"] },
      { id: "b5", liveId: 20, level: "Lv.3 자동화", title: "마케팅 자동화? 나민수님 초대석", shortTitle: "마케팅 자동화", description: "마케팅 자동화 전문가 나민수님 특별 라이브", youtubeUrl: "https://www.youtube.com/watch?v=jboErkZ8_CI", tags: ["마케팅", "자동화"], gains: ["마케팅 자동화 전략", "툴 활용법", "전문가 인사이트"], children: ["b6"] },
      { id: "b6", liveId: 9, level: "Lv.4 수익화", title: "2일 만에 1억 벌은 그의 사업 과정", shortTitle: "1억 사업", description: "사업 과정을 실시간으로 공개하는 특별 라이브", youtubeUrl: "https://www.youtube.com/watch?v=0VjUv74XbDA", tags: ["사업", "수익화"], gains: ["실전 사업 과정", "빠른 수익화 전략", "실행력 극대화"] },
    ],
  },
  {
    id: "automation",
    name: "자동화",
    emoji: "⚡",
    description: "반복 업무 해방 → 자동화 프로그램 제작까지",
    color: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.3)",
    nodes: [
      { id: "a1", liveId: 8, level: "Lv.1 입문", title: "퇴근이 빨라지는 Make 자동화 꿀팁 3가지", shortTitle: "Make 입문", description: "Make를 활용한 업무 자동화 꿀팁 3가지", youtubeUrl: "https://www.youtube.com/watch?v=J5Gu0aUcJoM", tags: ["Make", "자동화"], gains: ["Make 기본 사용법", "3가지 자동화 레시피", "퇴근 시간 단축"], children: ["a2", "a3"] },
      { id: "a2", liveId: 24, level: "Lv.2 명함", title: "명함 자동화 만들기", shortTitle: "명함 자동화", description: "Make를 활용해 명함 정보를 자동 관리", youtubeUrl: "https://www.youtube.com/watch?v=e3Glz81Ublk", tags: ["Make", "자동화"], gains: ["명함 자동 정리", "Make 시나리오 구축", "연락처 자동 관리"], children: ["a7"] },
      { id: "a3", liveId: 25, level: "Lv.2 리뷰", title: "리뷰 댓글 자동화", shortTitle: "리뷰 자동화", description: "리뷰 댓글을 AI로 자동화하는 방법", youtubeUrl: "https://www.youtube.com/watch?v=7TumdPD9nYM", tags: ["자동화", "AI"], gains: ["리뷰 자동 답글", "AI 활용 자동화", "고객 응대 효율화"], children: ["a4"] },
      { id: "a4", liveId: 22, level: "Lv.3 회의록", title: "플라우드노트 프로 — 회의록 자동화 끝판왕", shortTitle: "회의록 자동화", description: "Zapier + 노션 연동 회의록 자동화 완벽 가이드", youtubeUrl: "https://www.youtube.com/watch?v=KSI19aPorh0", tags: ["자동화", "노션"], gains: ["회의록 자동 생성", "Zapier 연동", "노션 자동 정리"], children: ["a5"] },
      { id: "a7", liveId: 50, level: "Lv.3 AI 명함", title: "메이크로 끝내는 명함 관리 — 리멤버 없이도 가능한 AI 자동화", shortTitle: "AI 명함 자동화", description: "Make + AI로 리멤버 없이 명함 관리", youtubeUrl: "https://www.youtube.com/watch?v=sNMzNZUeAqU", tags: ["Make", "자동화", "AI"], gains: ["AI 명함 인식", "리멤버 대체", "자동 분류 시스템"], children: ["a5"] },
      { id: "a5", liveId: 26, level: "Lv.4 프로그램", title: "150만원짜리 자동화 프로그램 만들기", shortTitle: "150만원 자동화", description: "실제 150만원 가치의 자동화 프로그램 제작", youtubeUrl: "https://www.youtube.com/watch?v=mZAwzv4r9fE", tags: ["자동화", "사업"], gains: ["자동화 프로그램 제작", "수익화 가능 수준", "Make 고급 활용"], children: ["a6"] },
      { id: "a6", liveId: 27, level: "Lv.5 영업", title: "영업 자동화 프로그램 만들기", shortTitle: "영업 자동화", description: "영업 프로세스를 자동화하는 프로그램 제작", youtubeUrl: "https://www.youtube.com/watch?v=FyXW06iLBGo", tags: ["자동화", "사업"], gains: ["영업 자동화 시스템", "고객 파이프라인 자동화", "매출 자동 추적"], children: ["a8"] },
      { id: "a8", liveId: 53, level: "Lv.6 끝판왕", title: "OpenClaw & n8n 활용 방법 대공개", shortTitle: "n8n 끝판왕", description: "OpenClaw와 n8n으로 자동화 끝판왕 만들기", youtubeUrl: "https://www.youtube.com/watch?v=1tfIZg5hoZ8", tags: ["n8n", "자동화"], gains: ["n8n 활용법", "OpenClaw 연동", "고급 워크플로우"] },
    ],
  },
  {
    id: "ai-biz",
    name: "AI 비즈니스",
    emoji: "🚀",
    description: "AI로 사업을 키우는 실전 인사이트",
    color: "#EC4899",
    glowColor: "rgba(236, 72, 153, 0.3)",
    nodes: [
      { id: "ab1", liveId: 29, level: "Lv.1 마인드셋", title: "AI 시대에 살아남는 사람의 특징", shortTitle: "AI 생존법", description: "1인사업자, 직장인 필수 시청 무료특강", youtubeUrl: "https://www.youtube.com/watch?v=obq0WnVXpMM", tags: ["AI", "사업"], gains: ["AI 시대 마인드셋", "필수 역량 파악", "생존 전략"], children: ["ab2", "ab3", "ab6"] },
      { id: "ab2", liveId: 35, level: "Lv.2 활용", title: "내 업무를 AI한테 맡기는 방법", shortTitle: "AI 업무 위임", description: "AI에게 업무를 효과적으로 위임하는 방법론", youtubeUrl: "https://www.youtube.com/watch?v=lvlyqWGCB3c", tags: ["AI", "생산성"], gains: ["AI 위임 전략", "프롬프트 설계", "업무 자동화 설계"], children: ["ab4"] },
      { id: "ab3", liveId: 36, level: "Lv.2 트렌드", title: "AI 트렌드 코리아 2026 — 장피엠 X 윤자동", shortTitle: "AI 트렌드", description: "2025 회고부터 2026 전망까지", youtubeUrl: "https://www.youtube.com/watch?v=f_yxK_Eopo0", tags: ["AI", "인터뷰"], gains: ["AI 트렌드 파악", "2026 전망", "투자 방향"], children: ["ab4"] },
      { id: "ab6", liveId: 40, level: "Lv.2 자동화", title: "AI가 내 PC를 조종한다? 브라우저 자동화 끝판왕 Manus", shortTitle: "Manus", description: "Manus로 PC를 자동 조종하는 AI 에이전트", youtubeUrl: "https://www.youtube.com/watch?v=qANJmiIBOOQ", tags: ["AI", "자동화"], gains: ["Manus 활용법", "AI 에이전트 이해", "브라우저 자동 제어"], children: ["ab4"] },
      { id: "ab4", liveId: 42, level: "Lv.3 실전", title: "당신이 기다렸던 진짜 혼자 다하는 AI 등장", shortTitle: "1인 AI", description: "혼자서 모든 걸 처리할 수 있는 AI 도구", youtubeUrl: "https://www.youtube.com/watch?v=fipV6y2sz64", tags: ["AI", "자동화"], gains: ["최신 AI 도구 활용", "1인 운영 시스템", "AI 자동화 실전"], children: ["ab5"] },
      { id: "ab5", liveId: 48, level: "Lv.4 스타트업", title: "릴리스AI — 투자 없이 90만 유저 달성한 부부 스타트업", shortTitle: "AI 스타트업", description: "오현수 대표, 김예인 공동창업자 인터뷰", youtubeUrl: "https://www.youtube.com/watch?v=eUhHYs-81Uk", tags: ["AI", "사업"], gains: ["AI 스타트업 전략", "유저 확보 노하우", "부트스트래핑 인사이트"], children: ["ab7"] },
      { id: "ab7", liveId: 55, level: "Lv.5 토크쇼", title: "AI 어벤져스 총 집합 — AI에 미친 4인의 현실 라이브 토크쇼", shortTitle: "AI 어벤져스", description: "AI 전문가 4인의 실전 토크쇼", youtubeUrl: "https://www.youtube.com/watch?v=-qvAw53awdE", tags: ["AI", "인터뷰"], gains: ["전문가 인사이트", "최신 AI 동향", "실전 활용 노하우"] },
    ],
  },
  {
    id: "excel",
    name: "엑셀",
    emoji: "📊",
    description: "엑셀에서 Replit 업그레이드까지",
    color: "#22C55E",
    glowColor: "rgba(34, 197, 94, 0.3)",
    nodes: [
      { id: "e1", liveId: 13, level: "Lv.1 입문", title: "클릭만 하면 바뀌는 엑셀 대시보드 만들기 (81만뷰)", shortTitle: "엑셀 대시보드", description: "초딩도 가능! 81만회 엑셀 대시보드 튜토리얼", youtubeUrl: "https://www.youtube.com/watch?v=pvcKY3EB_D0", tags: ["엑셀", "튜토리얼"], gains: ["엑셀 대시보드 제작", "피벗테이블 기초", "데이터 시각화"], children: ["e2"] },
      { id: "e2", liveId: 14, level: "Lv.2 활용", title: "재고관리 프로그램 직접 만들어 쓰세요 (36만뷰)", shortTitle: "재고관리", description: "36만회 — 엑셀로 재고관리 프로그램 직접 제작", youtubeUrl: "https://www.youtube.com/watch?v=jTJ6LSqrtlo", tags: ["엑셀", "자동화"], gains: ["재고관리 시스템 구축", "VBA 매크로 기초", "실전 업무 자동화"], children: ["e3"] },
      { id: "e3", liveId: 51, level: "Lv.3 업그레이드", title: "Replit으로 엑셀 재고관리 프로그램 업데이트", shortTitle: "Replit 업그레이드", description: "34만 조회수 엑셀 프로그램을 Replit으로 업그레이드", youtubeUrl: "https://www.youtube.com/watch?v=w1IKOhfT4as", tags: ["자동화", "엑셀"], gains: ["엑셀→웹앱 전환", "Replit 기초", "클라우드 프로그램 제작"] },
    ],
  },
];

/* ── 테이블 보장 (drizzle-kit push 미실행 환경 대비) ─── */
async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tech_tree_config (
      id SERIAL PRIMARY KEY,
      paths JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

/* ── GET /tech-tree (public) ──────────────────────────── */
router.get("/tech-tree", async (_req: Request, res: Response) => {
  try {
    await ensureTable();
    const rows = await db
      .select()
      .from(techTreeConfigTable)
      .orderBy(desc(techTreeConfigTable.id))
      .limit(1);
    if (rows.length === 0) {
      // 첫 호출 — 기본 시드 삽입
      const [seeded] = await db
        .insert(techTreeConfigTable)
        .values({ paths: DEFAULT_PATHS })
        .returning();
      return res.json({ paths: seeded.paths, updatedAt: seeded.updatedAt });
    }
    return res.json({ paths: rows[0].paths, updatedAt: rows[0].updatedAt });
  } catch (err) {
    logger.error({ err }, "GET /tech-tree failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PUT /tech-tree (admin) ───────────────────────────── */
router.put("/tech-tree", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const { paths } = req.body as { paths?: unknown };
    if (!Array.isArray(paths)) {
      return res.status(400).json({ error: "paths는 배열이어야 합니다." });
    }
    // 가장 최근 row만 보존하고 나머지는 정리. 단순히 새 row 추가 + 오래된 것 삭제 패턴.
    const [inserted] = await db
      .insert(techTreeConfigTable)
      .values({ paths, updatedAt: new Date() })
      .returning();
    // 옛 row들 정리 (최근 5개만 남김 — 백업 효과)
    await db.execute(sql`
      DELETE FROM tech_tree_config
      WHERE id NOT IN (
        SELECT id FROM tech_tree_config ORDER BY id DESC LIMIT 5
      )
    `);
    return res.json({ paths: inserted.paths, updatedAt: inserted.updatedAt });
  } catch (err) {
    logger.error({ err }, "PUT /tech-tree failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /tech-tree/reset (admin) — 기본값으로 리셋 ──── */
router.post("/tech-tree/reset", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    await ensureTable();
    const [inserted] = await db
      .insert(techTreeConfigTable)
      .values({ paths: DEFAULT_PATHS, updatedAt: new Date() })
      .returning();
    return res.json({ paths: inserted.paths, updatedAt: inserted.updatedAt });
  } catch (err) {
    logger.error({ err }, "POST /tech-tree/reset failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
