// ─── Video Factory Plans Data ───
// 윤자동 영상 기획 데이터 (버전 관리 포함)

export type HookType = "위기형" | "시나리오형" | "숨겨진기능형" | "수치약속형" | "감정형" | "경고형";
export type BodyFormat = "실습나열형" | "단계별프롬프트형" | "3단계구축형" | "비교형" | "풀코스형";

export interface VideoRef {
  id: string;
  title: string;
  channel: string;
  views: number;
  subs: number;
  ratio: number;
  uploadDate: string;
  url: string;
}

export interface BenchmarkRationale {
  quantitative: string;
  seo: string;
  structural: string;
}

export interface PlanVersion {
  version: number;
  versionLabel: string;        // "1차 기획", "2차 기획"
  createdAt: string;
  changeNote?: string;          // 버전별 변경 사유

  // 영상 개요
  topic: string;
  subtitle: string;             // 부제
  target: string;               // 타겟
  targetLength: string;         // 목표 길이
  coreMessage: string;          // 핵심 메시지
  format: string;               // 형식 설명

  // 분류
  hookType: HookType;
  bodyFormat: BodyFormat;

  // 벤치마킹
  anchor: VideoRef;
  rationale: BenchmarkRationale;
  insights: string[];           // 벤치마킹 시사점

  // 썸네일
  thumbTitle: string;
  thumbSub: string;
  videoTitle: string;

  // 인트로 3요소
  intro: {
    crisis: string;
    empathy: string;
    promise: string;
  };

  // 본문
  body: {
    setup: string[];
    practices: Array<{
      title: string;
      highlight?: string;
      prompt?: string;
    }>;
    midCta: string;
  };

  // 엔딩
  endingCta: {
    leadMagnet: string;
    subscribe: string;
    comment: string;
  };
  outro?: string;

  additionalRefs: VideoRef[];
}

export interface VideoPlan {
  id: string;
  versions: PlanVersion[];      // 최신 버전이 마지막
}

// ─── 헬퍼 ───
export function getLatestVersion(plan: VideoPlan): PlanVersion {
  return plan.versions[plan.versions.length - 1];
}

// ─── 데이터 ───

const COWORK_REF: VideoRef = {
  id: "cowork-anchor",
  title: "클로드 코워크로 업무 10배 빨라지는 방법 l 회사 업무에 바로 적용해보세요",
  channel: "소형채널",
  views: 40000,
  subs: 10000,
  ratio: 4.0,
  uploadDate: "2026-03-27",
  url: "",
};

const COWORK_RATIONALE: BenchmarkRationale = {
  quantitative: "1만 채널 / 2주만에 조회수 4만 (4.0x)",
  seo: "클로드 검색 시 상위노출 영상",
  structural: "타임라인별 활용 사례를 챕터로 정리 → 체류시간 확보 + 초보자 즉시 따라하기 가능",
};

const COWORK_INSIGHTS = [
  "소규모 채널(1만)에서도 실습형 콘텐츠는 높은 조회수 확보 가능",
  "검색 유입을 겨냥한 제목 설계가 장기 트래픽에 효과적",
  "챕터 구성으로 시청 유지율 관리에 유리",
  "타임라인별 활용 사례 챕터화로 체류시간 증가",
  "초보자도 바로 따라할 수 있는 사례 중심 구성",
];

export const PLANS: VideoPlan[] = [
  {
    id: "claude-cowork",
    versions: [
      {
        version: 1,
        versionLabel: "1차 기획",
        createdAt: "2026-04-09",
        changeNote: "최초 기획안",
        topic: "클로드 초보면 무조건 따라해보세요. 생산성이 200% 올라갑니다",
        subtitle: "클로드 시작 시 꼭 봐야하는 영상",
        target: "클로드 첫 입문자 / GPT만 사용 중인 직장인",
        targetLength: "20분 내외",
        coreMessage: "클로드 첫 입문자들이 쉽게 따라해볼 수 있는 7가지 실습 사례",
        format: "챕터별 실습 위주 영상",
        hookType: "위기형",
        bodyFormat: "실습나열형",
        anchor: COWORK_REF,
        rationale: COWORK_RATIONALE,
        insights: COWORK_INSIGHTS,
        thumbTitle: "200%",
        thumbSub: "클로드 초보 필수 7가지 실습",
        videoTitle: "클로드 시작 시 꼭 봐야하는 영상 | 생산성 200% 올리는 7가지 실습 (초보자용)",
        intro: {
          crisis: "아직도 GPT만 쓰고 계신분들 위기입니다",
          empathy: "요즘 주변에서 클로드라는 말 많이 듣지만 뭔진 잘 모르시죠?",
          promise: "이 영상 20분만 시청하시면 업무 생산성을 200% 향상 장담합니다. 오늘 영상은 무조건 멈추지 말고 끝까지 들으세요.",
        },
        body: {
          setup: ["회원가입 방법", "요금제 설명 (Free vs Pro)"],
          practices: [
            { title: "피그마 카드뉴스 자동 생성", highlight: "피그마에서 자동으로 생성되는 장면" },
            { title: "구글 캘린더에 미팅 자동 생성" },
            { title: "구글시트 커넥터로 데이터 분석", highlight: "윤자동 유튜브 성과 데이터 분석 + 보고서 작성" },
            { title: "고객사 미팅 녹취록 → 회의록 + 액션아이템 + 후속 메일" },
            { title: "PPT 발표자료 만들기" },
            { title: "SEO 분석 보고서 작성" },
            { title: "나만의 AI 에이전트 만들기" },
          ],
          midCta: "여기서 잠깐! 카톡방 입장 시 오늘 영상의 모든 프롬프트 자료 무료 제공합니다",
        },
        endingCta: {
          leadMagnet: "윤자동 카톡방 들어오시면 오늘 소개한 클로드 활용 방법 자료 무료로 드립니다",
          subscribe: "앞으로의 트렌디한 AI 소식과 실제로 바로 써먹을 수 있는 활용 사례를 보고 싶다면 아래에 구독버튼을 눌러주세요",
          comment: "댓글은 영상 제작에 큰 힘이 됩니다",
        },
        additionalRefs: [
          { id: "claude-skill-8k", title: "AI 잘쓰는 사람들이 요즘 클로드 스킬에 미쳐있는 이유 | 200% 활용법 전부 공개", channel: "소형채널(8천)", views: 97000, subs: 8000, ratio: 12.1, uploadDate: "2026-04-02", url: "" },
          { id: "claude-prod", title: "클로드로 업무 생산성 20배 올리는 제일 쉬운 방법", channel: "로사장", views: 110000, subs: 24000, ratio: 4.5, uploadDate: "2026-04-02", url: "" },
        ],
      },
      {
        version: 2,
        versionLabel: "2차 기획",
        createdAt: "2026-04-10",
        changeNote: "대표님 피드백 반영: 카드뉴스/유튜브 데이터/SEO는 초보 타겟과 미스매치 → 모든 직장인이 공감할 제너럴한 3가지로 압축",
        topic: "클로드 초보면 무조건 따라해보세요. 생산성이 200% 올라갑니다",
        subtitle: "클로드 시작 시 꼭 봐야하는 영상",
        target: "클로드 첫 입문자 / GPT만 사용 중인 직장인",
        targetLength: "15분 내외",
        coreMessage: "GPT만 쓰던 직장인이 클로드로 업무를 바꿔야 하는 이유 + 모든 직장인이 즉시 써먹을 수 있는 3가지 실습",
        format: "챕터별 실습 3가지 (제너럴 직장인 페인포인트 중심)",
        hookType: "위기형",
        bodyFormat: "실습나열형",
        anchor: COWORK_REF,
        rationale: COWORK_RATIONALE,
        insights: COWORK_INSIGHTS,
        thumbTitle: "200%",
        thumbSub: "직장인 필수 클로드 3가지",
        videoTitle: "클로드 시작 시 꼭 봐야하는 영상 | GPT만 쓰던 직장인이 200% 빨라지는 3가지 (초보자용)",
        intro: {
          crisis: "아직도 GPT만 쓰고 계신분들 위기입니다",
          empathy: "클로드라는 말 많이 듣지만 뭐가 다른지, 뭘 할 수 있는지 잘 모르시죠?",
          promise: "이 영상 15분만 시청하시면 모든 직장인이 매일 쓰는 3가지 업무를 클로드로 200% 빨라지게 만드는 법 완전 정복. 끝까지 들으세요.",
        },
        body: {
          setup: ["회원가입 방법 (이메일 1분)", "Free vs Pro 요금제 — 초보는 Free로 충분"],
          practices: [
            {
              title: "회의록 정리 + 액션 아이템 자동 추출",
              highlight: "녹취록 텍스트 → 클로드 → 정리된 회의록 + 할 일 리스트 변환 장면",
              prompt: "다음 회의 녹취록을 정리해줘. 1) 주요 논의사항 2) 결정사항 3) 액션 아이템 (담당자/마감일) 형식으로",
            },
            {
              title: "이메일 답장 자동 작성 (정중한 비즈니스 톤)",
              highlight: "고객사 이메일 → 클로드 → 정중한 답장 초안 생성 장면",
              prompt: "다음 이메일에 대한 정중하고 전문적인 답장 초안을 작성해줘. 톤은 비즈니스 매너에 맞게, 길이는 5문장 이내로",
            },
            {
              title: "긴 보고서/문서 핵심만 3줄 요약",
              highlight: "PDF 보고서 업로드 → 클로드 → 3줄 요약 + 핵심 키워드 추출",
              prompt: "이 문서를 읽고 1) 핵심 내용 3줄 요약 2) 중요 키워드 5개 3) 내가 알아야 할 인사이트 형식으로 정리해줘",
            },
          ],
          midCta: "여기서 잠깐! 오늘 보여드리는 3가지 프롬프트 템플릿, 카톡방에서 무료로 드립니다",
        },
        endingCta: {
          leadMagnet: "윤자동 카톡방 들어오시면 오늘 소개한 3가지 프롬프트 템플릿 + 클로드 시작 가이드 자료 무료로 드립니다",
          subscribe: "앞으로의 트렌디한 AI 소식과 실제로 바로 써먹을 수 있는 활용 사례를 보고 싶다면 아래에 구독버튼을 눌러주세요",
          comment: "여러분 회사 업무에서 가장 시간 잡아먹는 일이 뭔가요? 댓글로 알려주시면 다음 영상에서 다뤄드립니다",
        },
        additionalRefs: [
          { id: "claude-skill-8k", title: "AI 잘쓰는 사람들이 요즘 클로드 스킬에 미쳐있는 이유 | 200% 활용법 전부 공개", channel: "소형채널(8천)", views: 97000, subs: 8000, ratio: 12.1, uploadDate: "2026-04-02", url: "" },
          { id: "claude-prod", title: "클로드로 업무 생산성 20배 올리는 제일 쉬운 방법", channel: "로사장", views: 110000, subs: 24000, ratio: 4.5, uploadDate: "2026-04-02", url: "" },
        ],
      },
    ],
  },
  {
    id: "remotion",
    versions: [
      {
        version: 1,
        versionLabel: "1차 기획",
        createdAt: "2026-04-09",
        topic: "편집자 없이 영상 만드는 법 | 클로드코드+Remotion 영상 공장",
        subtitle: "프롬프트 한 줄로 영상 양산",
        target: "AI에 관심있는 크리에이터 / 영상 편집에 시간 쓰기 싫은 1인 사업자",
        targetLength: "18분 내외",
        coreMessage: "React 몰라도 가능한 AI 영상 자동화 전 과정 공개",
        format: "단계별 실습 + 실제 결과물 시연",
        hookType: "시나리오형",
        bodyFormat: "실습나열형",
        anchor: {
          id: "idVMGLzrrnU",
          title: "Claude Code Just Changed YouTube Videos Forever (Tutorial)",
          channel: "Danny Why",
          views: 219000,
          subs: 126000,
          ratio: 1.7,
          uploadDate: "2026-03-29",
          url: "https://www.youtube.com/watch?v=idVMGLzrrnU",
        },
        rationale: {
          quantitative: "12.6만 채널 / 11일만에 21.9만뷰 (1.7x)",
          seo: "Claude Code + Remotion 해외 1위 튜토리얼",
          structural: "설치부터 완성까지 풀 과정 + 실제 결과물 시각화",
        },
        insights: [
          "Remotion 한국어 영상이 거의 없어 선점 효과 가능",
          "실제 결과물(완성 영상)을 보여주는 게 핵심 후크",
          "비개발자도 가능하다는 점을 강조해야 진입장벽 낮춤",
        ],
        thumbTitle: "영상 공장",
        thumbSub: "편집자 없이 프롬프트 한 줄로 영상 양산",
        videoTitle: "클로드코드 + Remotion으로 편집 없이 영상 만드는 법 | 설치부터 완성까지 (비개발자 가능)",
        intro: {
          crisis: "영상 편집에 하루 3시간씩 쓰고 계신가요? 2026년엔 그럴 필요 없습니다",
          empathy: "Remotion이라고 들어보셨죠? 근데 React 몰라서 못 쓰고 계시죠?",
          promise: "이 영상 15분만 보시면 프롬프트 한 줄로 영상 만드는 법 완벽 마스터. 실제 제가 이걸로 만든 쇼츠도 보여드립니다.",
        },
        body: {
          setup: ["Remotion 스킬 설치 (Claude Code)", "Node.js 설치 확인"],
          practices: [
            { title: "첫 영상: 3초 인트로 만들기", highlight: "프롬프트 한 줄로 생성되는 장면" },
            { title: "씬 템플릿 설계 (intro → 본문 → outro)" },
            { title: "한국어 TTS 연결 (edge-tts 무료)" },
            { title: "자동 자막 타이밍 맞추기" },
            { title: "14종 visual 컴포넌트 활용", highlight: "윤자동 실제 쇼츠 제작 결과물 공개" },
          ],
          midCta: "여기까지 따라오셨다면 실전 프롬프트 템플릿 드립니다. 카톡방 입장하세요",
        },
        endingCta: {
          leadMagnet: "카톡방에서 Remotion 스킬 설치 가이드 + 씬 템플릿 코드 무료로 드립니다",
          subscribe: "AI 자동화 실전 노하우를 계속 받아보고 싶다면 구독 눌러주세요",
          comment: "어떤 종류의 영상을 자동화하고 싶으신지 댓글로 알려주세요",
        },
        additionalRefs: [
          { id: "arrKfg0V268", title: "이제 클로드 코드가 기획자이자 편집자입니다. 100% 자동화", channel: "빌더 조쉬", views: 35000, subs: 46000, ratio: 0.8, uploadDate: "2026-04-04", url: "https://www.youtube.com/watch?v=arrKfg0V268" },
          { id: "remotion-5pm", title: "🔥 실용성 미쳤다! 클로드 코드 + Remotion = 영상 공장 완성", channel: "오후다섯씨", views: 10000, subs: 51700, ratio: 0.2, uploadDate: "2026-02-10", url: "" },
        ],
      },
    ],
  },
  {
    id: "elon-gems",
    versions: [
      {
        version: 1,
        versionLabel: "1차 기획",
        createdAt: "2026-04-10",
        topic: "일론머스크, 빌게이츠를 직원으로 채용했다고? | GEMS 신기능 완벽 활용법",
        subtitle: "Gemini Gems로 세계 최고 어드바이저 만들기",
        target: "AI에 관심있는 직장인 / 1인 사업가 / 사이드 프로젝트 운영자",
        targetLength: "15분 내외",
        coreMessage: "Gemini Gems로 세계적 인사이트를 가진 AI 어드바이저를 무료로 만드는 3단계 방법",
        format: "3단계 Gems 구축 시연",
        hookType: "시나리오형",
        bodyFormat: "3단계구축형",
        anchor: {
          id: "gem-anchor-elon",
          title: "제미나이 숨겨진 기능 'GEM'으로 야근탈출! 나만의 AI 업무 자동화 도구 만들기",
          channel: "소형채널",
          views: 240000,
          subs: 30000,
          ratio: 8.0,
          uploadDate: "2026-03-10",
          url: "",
        },
        rationale: {
          quantitative: "3만 채널 / 1개월만에 24만뷰 (8.0x)",
          seo: "Gemini Gems 키워드 급상승 + 일론머스크/빌게이츠 검색량 항상 높음",
          structural: "'유명인 채용'이라는 비현실적 시나리오 + 3단계 명확한 구축 과정",
        },
        insights: [
          "Gems 키워드는 검색 트렌드 급상승 중 (2026년 4월 기준)",
          "'야근 탈출' 같은 직장인 페인 포인트 후크가 강력",
          "유명인 시나리오는 클릭률을 크게 높임",
        ],
        thumbTitle: "??? 채용",
        thumbSub: "일론머스크 : ??? / 빌게이츠 : ???",
        videoTitle: "일론머스크, 빌게이츠를 직원으로 채용했다고? | Gemini GEMS 신기능으로 세계 최고 어드바이저 만들기",
        intro: {
          crisis: "아직도 ChatGPT에 일반 질문만 던지고 계신가요? 그거 엄청난 손해입니다",
          empathy: "일론머스크한테 직접 사업 조언 받고 싶지 않으세요? 빌게이츠한테 투자 의견 듣고 싶죠?",
          promise: "이 영상 15분이면 Gemini Gems로 일론머스크/빌게이츠 AI 어드바이저 만들기 완성. 와이프 챗봇까지 3단계로 보여드립니다.",
        },
        body: {
          setup: ["Gemini 무료 가입", "Gems 메뉴 진입 (숨겨진 위치)"],
          practices: [
            { title: "1단계: 일론머스크 자료 딥리서치", highlight: "GPT Deep Research로 자료 수집", prompt: "일론머스크의 경영 철학, 주요 의사결정, 최근 인터뷰를 종합적으로 리서치해줘" },
            { title: "2단계: Gems에 자료 주입 + 페르소나 설정", highlight: "Gem 생성 화면 + 자료 업로드", prompt: "당신은 일론머스크입니다. 아래 자료를 기반으로 일론머스크의 말투, 철학, 의사결정 패턴으로 답변하세요" },
            { title: "3단계: 일론머스크 챗봇으로 실전 질문", highlight: "실제 비즈니스 질문 → 일론머스크 스타일 답변" },
            { title: "보너스: 빌게이츠 Gem도 똑같이 만들기" },
            { title: "보너스2: 와이프 챗봇 만들기 (개인용)", highlight: "감정적 호소 - 개인 생활 AI" },
          ],
          midCta: "이거 만드는 프롬프트 전부 카톡방에서 무료 배포합니다",
        },
        endingCta: {
          leadMagnet: "카톡방 입장 시 일론머스크/빌게이츠 Gems 프롬프트 + 딥리서치 프롬프트 무료 제공",
          subscribe: "매주 새로운 Gems 아이디어 올라옵니다. 구독하고 나만의 AI 어드바이저 팀 만드세요",
          comment: "다음 영상에서 만들어드릴 Gems 인물 추천해주세요. 댓글 많은 순으로 제작합니다",
        },
        additionalRefs: [
          { id: "gem-setup-2", title: "(무료 자료 제공) 99%가 모르는 Gemini 3 설정법 7가지!", channel: "소형채널(1.83만)", views: 27000, subs: 18300, ratio: 1.5, uploadDate: "2026-01-10", url: "" },
          { id: "nblm-merge-2", title: "NotebookLM and Gemini Just Merged (Massive Update)", channel: "해외채널", views: 77000, subs: 350000, ratio: 0.2, uploadDate: "2026-04-09", url: "" },
        ],
      },
    ],
  },
  {
    id: "claude-f1",
    versions: [
      {
        version: 1,
        versionLabel: "1차 기획",
        createdAt: "2026-04-10",
        topic: "클로드코드로 F1 자동차 시승하기 | 테슬라 스타일 3D 자동화 프로젝트",
        subtitle: "비현실적 시나리오로 클로드코드 한계 테스트",
        target: "클로드코드 사용 경험 있는 사람 / 바이브코딩에 관심있는 비개발자",
        targetLength: "18분 내외",
        coreMessage: "클로드코드로 실제 F1 자동차 3D 모델을 만들고 조작하는 전 과정 공개",
        format: "단계별 프롬프트 + 실시간 결과물 시연",
        hookType: "시나리오형",
        bodyFormat: "단계별프롬프트형",
        anchor: {
          id: "NTfXwQ85suw",
          title: "Full 3D Animation using Remotion with Claude Code",
          channel: "Lukas Margerie",
          views: 19801,
          subs: 15800,
          ratio: 1.3,
          uploadDate: "2026-02-25",
          url: "https://www.youtube.com/watch?v=NTfXwQ85suw",
        },
        rationale: {
          quantitative: "1.58만 채널 / 약 1.5개월만에 1.98만뷰 (1.3x)",
          seo: "Claude Code + Remotion + 3D Animation 키워드 조합 — 해외 검색 상위",
          structural: "프롬프트 → 결과물 시연 → 단계 확장 구조 + 실제 3D 작품으로 시각적 임팩트 극대화",
        },
        insights: [
          "3D/시각적 결과물은 텍스트 튜토리얼보다 클릭률이 2~3배 높음",
          "구독자 1.5만 채널이 1.3x 배율 — 우리 채널 6만 기준 5~10만뷰 가능",
          "Remotion + Claude Code 조합은 한국어 영상이 거의 없어 선점 효과 큼",
          "비현실적 프로젝트(F1, 자동화 아파트)는 호기심 후크 강함",
          "단계별 프롬프트 공개 = 따라하기 쉬움 + 신뢰도 상승",
        ],
        thumbTitle: "F1 시승",
        thumbSub: "클로드코드로 테슬라 스타일 자동차 만들기",
        videoTitle: "클로드코드로 F1 자동차 시승하기 | 테슬라 스타일 3D 자동화 프로젝트 (전 과정 공개)",
        intro: {
          crisis: "클로드코드 사용법 영상은 많은데, 막상 뭘 만들 수 있는지 감이 안 오시죠?",
          empathy: "테슬라에서 완전 자동화된 아파트를 만든다면? F1 자동차를 직접 만들어본다면 어떨까요?",
          promise: "이 영상 18분이면 클로드코드로 3D F1 자동차 만들기 완성. 프롬프트 3개 공개합니다.",
        },
        body: {
          setup: ["클로드코드 설치 (맥/윈도우)", "Three.js 기본 프로젝트 세팅"],
          practices: [
            { title: "1단계: 기본 F1 자동차 모델 생성", highlight: "첫 프롬프트 → 와이어프레임 결과", prompt: "Three.js로 F1 레이싱카 3D 모델을 만들어줘. 빨간색 바디에 에어로다이나믹 디자인으로" },
            { title: "2단계: 조작 가능하게 만들기", highlight: "키보드 조작 + 물리 엔진", prompt: "WASD 키로 조작 가능하게 만들고, 물리 엔진(Cannon.js)을 추가해서 실제 주행 느낌 구현해줘" },
            { title: "3단계: 서킷 트랙 + 카메라 시점", highlight: "완성된 F1 시승 시뮬레이터 시연", prompt: "모나코 서킷 스타일의 트랙을 만들고, 1인칭/3인칭 카메라 전환 기능 추가해줘" },
            { title: "보너스: 완전 자동화된 아파트 프로젝트 아이디어" },
          ],
          midCta: "여기까지 따라오셨으면 이미 반 성공입니다. 3개 프롬프트 전부 카톡방에서 드립니다",
        },
        endingCta: {
          leadMagnet: "카톡방 입장 시 F1 자동차 3개 프롬프트 + Three.js 기본 세팅 코드 무료 제공",
          subscribe: "클로드코드로 만드는 비현실적 프로젝트 시리즈 계속 올라옵니다",
          comment: "다음 프로젝트 아이디어 추천해주세요. 가장 많은 추천받은 프로젝트로 만듭니다",
        },
        outro: "디자이너, 영상편집자 becarefull. 조심하세요 ㅎ 끝.",
        additionalRefs: [
          { id: "arrKfg0V268-f1", title: "이제 클로드 코드가 기획자이자 편집자입니다. 100% 자동화", channel: "빌더 조쉬", views: 35000, subs: 46000, ratio: 0.8, uploadDate: "2026-04-04", url: "https://www.youtube.com/watch?v=arrKfg0V268" },
          { id: "remotion-3d", title: "클로드 코드의 리모션을 사용한 완전한 3D 애니메이션", channel: "소형채널(1.58만)", views: 19000, subs: 15800, ratio: 1.2, uploadDate: "2026-03-10", url: "" },
        ],
      },
    ],
  },
  {
    id: "gemini-gems",
    versions: [
      {
        version: 1,
        versionLabel: "1차 기획",
        createdAt: "2026-04-09",
        topic: "제미나이 Gems 활용법 | 99%가 모르는 무료 AI 업무 자동화 도구",
        subtitle: "야근 탈출 — 무료로 만드는 나만의 AI 비서",
        target: "구글 워크스페이스 사용자 / AI 무료 도구 선호 직장인",
        targetLength: "12분 내외",
        coreMessage: "제미나이 Gems로 나만의 커스텀 AI 비서 만들기 (무료)",
        format: "실습 6가지 + 비교 분석",
        hookType: "숨겨진기능형",
        bodyFormat: "실습나열형",
        anchor: {
          id: "gem-anchor",
          title: "제미나이 숨겨진 기능 'GEM'으로 야근탈출! 나만의 AI 업무 자동화 도구 만들기",
          channel: "소형채널",
          views: 240000,
          subs: 30000,
          ratio: 8.0,
          uploadDate: "2026-03-10",
          url: "",
        },
        rationale: {
          quantitative: "3만 채널 / 1개월만에 24만뷰 (8.0x)",
          seo: "Gemini 검색 시 야근/업무자동화 키워드 상위",
          structural: "'숨겨진 기능' 후크 + 야근탈출이라는 직장인 페인 포인트",
        },
        insights: [
          "'숨겨진 기능' 후크가 호기심 자극에 효과적",
          "무료 도구 강조는 진입장벽 낮춤",
          "직장인 페인 포인트(야근)와 직접 연결",
        ],
        thumbTitle: "야근 탈출",
        thumbSub: "제미나이 숨겨진 기능 GEM 하나로",
        videoTitle: "99%가 모르는 제미나이 Gems 활용법 | 무료로 나만의 AI 업무 도구 만드는 법",
        intro: {
          crisis: "매일 야근하면서 AI 유료 결제까지 하시는 분들 손해입니다",
          empathy: "제미나이에 Gems라는 기능 있는 거 아셨나요? 99%는 아직도 모르고 있죠",
          promise: "이 영상 12분이면 무료로 나만의 AI 업무 비서 완성. 야근 시간 절반으로 줄어듭니다.",
        },
        body: {
          setup: ["제미나이 무료 가입", "Gems 메뉴 찾기 (숨겨져 있음)"],
          practices: [
            { title: "Gem #1: 이메일 자동 답장 비서" },
            { title: "Gem #2: 회의록 정리 전문가", highlight: "실제 녹취록 → 정리본 변환" },
            { title: "Gem #3: SEO 블로그 작성기" },
            { title: "Gem #4: 데이터 분석 리포터" },
            { title: "NotebookLM + Gemini 통합 활용법", highlight: "2026년 4월 최신 업데이트" },
            { title: "Gems vs Claude Projects vs ChatGPT GPTs 비교" },
          ],
          midCta: "여기서 잠깐! 제가 실제로 쓰는 Gems 프롬프트 템플릿 카톡방에서 무료 배포 중입니다",
        },
        endingCta: {
          leadMagnet: "카톡방 입장 시 오늘 만든 Gems 4종 프롬프트 파일 무료 제공",
          subscribe: "무료로 쓰는 AI 꿀팁 매주 올라옵니다. 구독하고 야근에서 탈출하세요",
          comment: "만들고 싶은 Gems 아이디어가 있다면 댓글로 남겨주세요",
        },
        additionalRefs: [
          { id: "gem-setup", title: "(무료 자료 제공) 99%가 모르는 Gemini 3 설정법 7가지!", channel: "소형채널(1.83만)", views: 27000, subs: 18300, ratio: 1.5, uploadDate: "2026-01-10", url: "" },
          { id: "nblm-merge", title: "NotebookLM and Gemini Just Merged (Massive Update)", channel: "해외채널", views: 77000, subs: 350000, ratio: 0.2, uploadDate: "2026-04-09", url: "" },
        ],
      },
    ],
  },
];
