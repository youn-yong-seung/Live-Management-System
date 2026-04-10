import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, ExternalLink, TrendingUp, Users, Eye, Calendar,
  ChevronDown, ChevronUp, Lightbulb,
  Film, Zap, Target, X, Clapperboard, Lock, Loader2,
  Anchor, Sparkles, Flag, MessageSquare, BarChart3, PlayCircle, Copy, Check
} from "lucide-react";

// ─── Types ───
interface VideoRef {
  id: string;
  title: string;
  channel: string;
  views: number;
  subs: number;
  ratio: number;
  uploadDate: string;
  url: string;
}

interface BenchmarkRationale {
  quantitative: string;   // "1만 채널 / 2주만에 4만뷰"
  seo: string;            // "클로드 검색 시 상위노출"
  structural: string;     // "챕터별 실습 위주 영상"
}

type HookType = "위기형" | "시나리오형" | "숨겨진기능형" | "수치약속형" | "감정형" | "경고형";
type BodyFormat = "실습나열형" | "단계별프롬프트형" | "3단계구축형" | "비교형" | "풀코스형";

interface VideoPlan {
  id: string;
  hookType: HookType;
  bodyFormat: BodyFormat;
  // 앵커 벤치마킹
  anchor: VideoRef;
  rationale: BenchmarkRationale;
  // 주제
  topic: string;
  valueMessage: string;
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
  // 본문 (format별로 다른 구조)
  body: {
    setup: string[];
    practices: Array<{
      title: string;
      highlight?: string;
      prompt?: string;          // 단계별 프롬프트형에서 사용
    }>;
    midCta: string;
  };
  // 엔딩 CTA 3중
  endingCta: {
    leadMagnet: string;
    subscribe: string;
    comment: string;
  };
  outro?: string;               // 특수 아웃트로 (경고/농담형 등)
  additionalRefs: VideoRef[];
}

// ─── Helpers ───
function toKr(n: number) {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "천";
  return n.toString();
}

function daysAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 864e5);
  if (diff <= 0) return "오늘";
  if (diff < 30) return `${diff}일 전`;
  if (diff < 365) return `${Math.floor(diff / 30)}개월 전`;
  return `${Math.floor(diff / 365)}년 전`;
}

function ratioColor(r: number) {
  if (r >= 10) return "text-red-400";
  if (r >= 5) return "text-orange-400";
  if (r >= 2) return "text-yellow-400";
  if (r >= 1) return "text-green-400";
  return "text-white/40";
}

function extractVideoId(url: string) {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Sample Data ───
const SAMPLE_PLANS: VideoPlan[] = [
  {
    id: "claude-cowork",
    hookType: "위기형",
    bodyFormat: "실습나열형",
    anchor: {
      id: "cowork-ref",
      title: "클로드 코워크로 업무 10배 빨라지는 방법 l 회사 업무에 바로 적용해보세요",
      channel: "소형채널",
      views: 40000,
      subs: 10000,
      ratio: 4.0,
      uploadDate: "2026-03-27",
      url: "",
    },
    rationale: {
      quantitative: "1만 채널 / 2주만에 조회수 4만 (4.0x)",
      seo: "클로드 검색 시 상위노출 영상",
      structural: "챕터별 실습 위주 — 초보도 따라하기 쉬운 구조",
    },
    topic: "클로드 초보면 무조건 따라해보세요 | 생산성이 200% 올라갑니다",
    valueMessage: "클로드 첫 입문자들이 쉽게 따라해볼 수 있는 7가지 실습 사례",
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
        { title: "구글시트 커넥터로 데이터 분석", highlight: "윤자동 유튜브 성과 데이터 분석 및 보고서 작성 실시간" },
        { title: "고객사 미팅 녹취록 → 회의록 + 액션아이템 + 후속 메일 초안" },
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
    id: "remotion",
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
    topic: "편집자 없이 영상 만드는 법 | 클로드코드+Remotion 영상 공장",
    valueMessage: "React 몰라도 가능한 AI 영상 자동화 전 과정 공개",
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
        { title: "14종 visual 컴포넌트 활용 (CodeBlock, Comparison, BarChart 등)" },
        { title: "렌더링 → 유튜브 업로드까지 자동화", highlight: "윤자동 실제 쇼츠 제작 결과물 공개" },
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
  {
    id: "gemini-gems",
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
    topic: "제미나이 Gems 활용법 | 99%가 모르는 무료 AI 업무 자동화 도구",
    valueMessage: "제미나이 Gems로 나만의 커스텀 AI 비서 만들기 (무료)",
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
        { title: "Gem #2: 회의록 정리 전문가", highlight: "실제 녹취록 → 정리본 변환 장면" },
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
      comment: "만들고 싶은 Gems 아이디어가 있다면 댓글로 남겨주세요. 다음 영상에서 만들어드립니다",
    },
    additionalRefs: [
      { id: "gem-setup", title: "(무료 자료 제공) 99%가 모르는 Gemini 3 설정법 7가지!", channel: "소형채널(1.83만)", views: 27000, subs: 18300, ratio: 1.5, uploadDate: "2026-01-10", url: "" },
      { id: "nblm-merge", title: "NotebookLM and Gemini Just Merged (Massive Update)", channel: "해외채널", views: 77000, subs: 350000, ratio: 0.2, uploadDate: "2026-04-09", url: "" },
    ],
  },
  {
    id: "elon-gems",
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
      structural: "'유명인 채용'이라는 비현실적 시나리오 후크 + 3단계 명확한 구축 과정",
    },
    topic: "일론머스크, 빌게이츠를 직원으로 채용했다고? | GEMS 신기능 완벽 활용법",
    valueMessage: "Gemini Gems로 세계적 인사이트를 가진 AI 어드바이저를 무료로 만드는 3단계 방법",
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
        { title: "1단계: 일론머스크 자료 딥리서치", highlight: "GPT Deep Research로 일론머스크 인터뷰/책/논문 수집하는 장면", prompt: "일론머스크의 경영 철학, 주요 의사결정, 최근 인터뷰를 종합적으로 리서치해줘" },
        { title: "2단계: Gems에 자료 주입 + 페르소나 설정", highlight: "Gem 생성 화면 + 자료 업로드", prompt: "당신은 일론머스크입니다. 아래 자료를 기반으로 일론머스크의 말투, 철학, 의사결정 패턴으로 답변하세요" },
        { title: "3단계: 일론머스크 챗봇으로 실전 질문", highlight: "실제 비즈니스 질문 → 일론머스크 스타일 답변 받는 장면" },
        { title: "보너스: 빌게이츠 Gem도 똑같이 만들기" },
        { title: "보너스2: 와이프 챗봇 만들기 (개인용)", highlight: "감정적 호소 포인트 - 개인 생활 AI" },
      ],
      midCta: "이거 만드는 프롬프트 전부 카톡방에서 무료 배포합니다. 따라하려면 꼭 입장하세요",
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
  {
    id: "claude-f1",
    hookType: "시나리오형",
    bodyFormat: "단계별프롬프트형",
    anchor: {
      id: "idVMGLzrrnU-f1",
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
      seo: "Claude Code + 시각적 프로젝트 검색 급상승",
      structural: "'비현실적 목표' 시나리오 + 단계별 프롬프트 + 실제 결과물 공개",
    },
    topic: "클로드코드로 F1 자동차 시승하기 | 테슬라 스타일 3D 자동화 프로젝트",
    valueMessage: "클로드코드로 실제 F1 자동차 3D 모델을 만들고 조작하는 전 과정 공개",
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
        { title: "2단계: 조작 가능하게 만들기", highlight: "키보드 조작 + 물리 엔진 적용", prompt: "WASD 키로 조작 가능하게 만들고, 물리 엔진(Cannon.js)을 추가해서 실제 주행 느낌 구현해줘" },
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
];

// ─── Components ───

function VideoRefCard({ video, anchor = false }: { video: VideoRef; anchor?: boolean }) {
  const thumb = extractVideoId(video.url) ? `https://img.youtube.com/vi/${extractVideoId(video.url)}/mqdefault.jpg` : null;
  return (
    <a
      href={video.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-lg overflow-hidden transition-all duration-300 ${video.url ? "hover:-translate-y-0.5 cursor-pointer" : "opacity-80"} ${anchor ? "border border-[#CC9965]/40 bg-[#CC9965]/[0.05]" : "border border-white/10 bg-white/[0.02]"}`}
    >
      <div className="flex gap-3 p-3">
        <div className="w-32 aspect-video bg-white/[0.03] rounded relative overflow-hidden flex-shrink-0">
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-6 h-6 text-white/20" />
            </div>
          )}
          {anchor && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#CC9965] text-black text-[9px] font-bold">
              ANCHOR
            </div>
          )}
          <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md bg-black/60 ${ratioColor(video.ratio)}`}>
            {video.ratio.toFixed(1)}x
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/90 line-clamp-2 leading-snug">{video.title}</p>
          <p className="text-[10px] text-white/40 mt-1 truncate">{video.channel}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/30">
            <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{toKr(video.views)}</span>
            <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{toKr(video.subs)}</span>
            {video.uploadDate && <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{daysAgo(video.uploadDate)}</span>}
          </div>
        </div>
        {video.url && <ExternalLink className="w-3 h-3 text-white/20 flex-shrink-0" />}
      </div>
    </a>
  );
}

function PlanDetail({ plan }: { plan: VideoPlan }) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 1500);
  };

  const fullScript = `
[영상 주제]
${plan.topic}

[전달 메세지]
${plan.valueMessage}

[인트로]
${plan.intro.crisis}
${plan.intro.empathy}
${plan.intro.promise}

[본문 — 기본 세팅]
${plan.body.setup.map((s, i) => `${i + 1}. ${s}`).join("\n")}

[본문 — 실습 사례]
${plan.body.practices.map((p, i) => `${i + 1}. ${p.title}${p.highlight ? `\n   ⭐ 하이라이트: ${p.highlight}` : ""}`).join("\n")}

[중간 CTA]
${plan.body.midCta}

[엔딩 CTA]
1) 리드 수집: ${plan.endingCta.leadMagnet}
2) 구독 유도: ${plan.endingCta.subscribe}
3) 댓글 유도: ${plan.endingCta.comment}
${plan.outro ? `\n[아웃트로]\n${plan.outro}` : ""}
`.trim();

  return (
    <div className="border-t border-white/[0.06]">
      {/* 벤치마킹 근거 */}
      <div className="px-5 py-4 bg-white/[0.02] border-b border-white/[0.04]">
        <h4 className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-1.5">
          <Anchor className="w-3.5 h-3.5 text-[#CC9965]" /> 벤치마킹 근거
        </h4>
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="flex items-start gap-2 text-xs">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-[10px] uppercase">정량적</p>
              <p className="text-white/80">{plan.rationale.quantitative}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Search className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-[10px] uppercase">SEO</p>
              <p className="text-white/80">{plan.rationale.seo}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Flag className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-[10px] uppercase">구조적 강점</p>
              <p className="text-white/80">{plan.rationale.structural}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 앵커 벤치마킹 영상 */}
      <div className="p-5 border-b border-white/[0.04]">
        <h4 className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-[#CC9965]" /> 앵커 벤치마킹
        </h4>
        <VideoRefCard video={plan.anchor} anchor />
      </div>

      {/* 주제 & 메세지 */}
      <div className="p-5 border-b border-white/[0.04]">
        <div className="mb-4">
          <p className="text-[10px] uppercase text-white/40 mb-1">영상 주제</p>
          <h3 className="text-base font-bold text-white">{plan.topic}</h3>
        </div>
        <div>
          <p className="text-[10px] uppercase text-white/40 mb-1">전달 메세지</p>
          <p className="text-sm text-[#CC9965]">{plan.valueMessage}</p>
        </div>
      </div>

      {/* 인트로 3요소 */}
      <div className="p-5 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#CC9965]" /> 인트로 (30초 룰)
          </h4>
          <button
            onClick={() => copyToClipboard(`${plan.intro.crisis}\n${plan.intro.empathy}\n${plan.intro.promise}`, "intro")}
            className="text-[10px] text-white/40 hover:text-[#CC9965] flex items-center gap-1"
          >
            {copiedSection === "intro" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            복사
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex gap-3 text-xs">
            <span className="text-red-400 font-bold w-14 flex-shrink-0">위기</span>
            <p className="text-white/80">{plan.intro.crisis}</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-blue-400 font-bold w-14 flex-shrink-0">공감</span>
            <p className="text-white/80">{plan.intro.empathy}</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-green-400 font-bold w-14 flex-shrink-0">약속</span>
            <p className="text-white/80">{plan.intro.promise}</p>
          </div>
        </div>
      </div>

      {/* 본문 구조 */}
      <div className="p-5 border-b border-white/[0.04]">
        <h4 className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5 text-[#CC9965]" /> 본문 구조
        </h4>

        {/* 기본 세팅 */}
        <div className="mb-4">
          <p className="text-[10px] uppercase text-white/40 mb-2">기본 세팅</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.body.setup.map((s, i) => (
              <Badge key={i} variant="outline" className="border-white/15 text-white/60 text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* 실습 사례 */}
        <div className="mb-4">
          <p className="text-[10px] uppercase text-white/40 mb-2">
            {plan.bodyFormat === "단계별프롬프트형" || plan.bodyFormat === "3단계구축형" ? "단계별 프롬프트" : "실습 사례"} ({plan.body.practices.length}개)
          </p>
          <div className="space-y-2">
            {plan.body.practices.map((p, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-[#CC9965] font-bold flex-shrink-0">{i + 1}.</span>
                <div className="flex-1 space-y-1">
                  <p className="text-white/80">{p.title}</p>
                  {p.prompt && (
                    <div className="p-2 rounded bg-blue-500/[0.06] border border-blue-500/20 text-[10px] text-blue-300 font-mono leading-relaxed">
                      💬 {p.prompt}
                    </div>
                  )}
                  {p.highlight && (
                    <p className="text-[10px] text-yellow-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {p.highlight}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 중간 CTA */}
        <div className="p-3 rounded-lg bg-[#CC9965]/[0.08] border border-[#CC9965]/20">
          <p className="text-[10px] uppercase text-[#CC9965]/80 mb-1">중간 CTA</p>
          <p className="text-xs text-white/80">{plan.body.midCta}</p>
        </div>
      </div>

      {/* 엔딩 CTA 3중 */}
      <div className="p-5 border-b border-white/[0.04]">
        <h4 className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#CC9965]" /> 엔딩 CTA (3중 구조)
        </h4>
        <div className="space-y-2">
          <div className="flex gap-3 text-xs">
            <span className="text-orange-400 font-bold w-20 flex-shrink-0">리드 수집</span>
            <p className="text-white/80">{plan.endingCta.leadMagnet}</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-blue-400 font-bold w-20 flex-shrink-0">구독 유도</span>
            <p className="text-white/80">{plan.endingCta.subscribe}</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-pink-400 font-bold w-20 flex-shrink-0">댓글 유도</span>
            <p className="text-white/80">{plan.endingCta.comment}</p>
          </div>
        </div>
      </div>

      {/* 특수 아웃트로 (있을 때만) */}
      {plan.outro && (
        <div className="p-5 border-b border-white/[0.04]">
          <h4 className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-orange-400" /> 아웃트로 멘트
          </h4>
          <div className="p-3 rounded-lg bg-orange-400/[0.06] border border-orange-400/20">
            <p className="text-sm text-orange-200 italic">"{plan.outro}"</p>
          </div>
        </div>
      )}

      {/* 보조 레퍼런스 */}
      {plan.additionalRefs.length > 0 && (
        <div className="p-5">
          <h4 className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-white/40" /> 보조 레퍼런스
          </h4>
          <div className="space-y-2">
            {plan.additionalRefs.map(r => <VideoRefCard key={r.id} video={r} />)}
          </div>
        </div>
      )}

      {/* 전체 복사 */}
      <div className="p-5 border-t border-white/[0.04] bg-white/[0.02]">
        <button
          onClick={() => copyToClipboard(fullScript, "full")}
          className="w-full py-3 rounded-lg bg-[#CC9965]/15 hover:bg-[#CC9965]/25 text-[#CC9965] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {copiedSection === "full" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiedSection === "full" ? "복사 완료!" : "전체 기획안 복사"}
        </button>
      </div>
    </div>
  );
}

const HOOK_COLORS: Record<HookType, string> = {
  "위기형": "border-red-400/40 text-red-400",
  "시나리오형": "border-purple-400/40 text-purple-400",
  "숨겨진기능형": "border-yellow-400/40 text-yellow-400",
  "수치약속형": "border-green-400/40 text-green-400",
  "감정형": "border-pink-400/40 text-pink-400",
  "경고형": "border-orange-400/40 text-orange-400",
};

function PlanCard({ plan, isOpen, onToggle }: { plan: VideoPlan; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${HOOK_COLORS[plan.hookType]}`}>
                {plan.hookType}
              </Badge>
              <Badge variant="outline" className="border-blue-400/40 text-blue-400 text-[10px]">
                {plan.bodyFormat}
              </Badge>
              <Badge variant="outline" className="border-[#CC9965]/40 text-[#CC9965] text-[10px]">
                앵커 {plan.anchor.ratio.toFixed(1)}x
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/50 text-[10px]">
                {toKr(plan.anchor.views)}뷰 / {toKr(plan.anchor.subs)} 구독자
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{plan.topic}</h3>
            <p className="text-sm text-white/50">{plan.valueMessage}</p>
          </div>
          <div className="flex-shrink-0 pt-1">
            {isOpen ? <ChevronUp className="w-5 h-5 text-white/30" /> : <ChevronDown className="w-5 h-5 text-white/30" />}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <div className="w-48 h-28 rounded-lg bg-gradient-to-br from-[#CC9965]/20 to-[#CC9965]/5 border border-[#CC9965]/20 flex flex-col items-center justify-center gap-1 flex-shrink-0">
            <span className="text-2xl font-black text-[#CC9965]">{plan.thumbTitle}</span>
            <span className="text-[10px] text-white/50 text-center px-2 leading-tight">{plan.thumbSub}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Target className="w-3 h-3" /> 영상 제목
            </div>
            <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{plan.videoTitle}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-white/40 pt-1">
              <Anchor className="w-3 h-3" /> {plan.rationale.quantitative}
            </div>
          </div>
        </div>
      </button>

      {isOpen && <PlanDetail plan={plan} />}
    </div>
  );
}

// ─── Main Page ───

export default function VideoFactory() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return sessionStorage.getItem("crm_admin_auth") === "1"; } catch { return false; }
  });
  const [loginPwd, setLoginPwd] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [openPlanId, setOpenPlanId] = useState<string | null>("claude-cowork");
  const [searchQuery, setSearchQuery] = useState("");

  const plans = useMemo(() => {
    if (!searchQuery) return SAMPLE_PLANS;
    const q = searchQuery.toLowerCase();
    return SAMPLE_PLANS.filter(
      p => p.topic.toLowerCase().includes(q) ||
        p.videoTitle.toLowerCase().includes(q) ||
        p.valueMessage.toLowerCase().includes(q) ||
        p.anchor.title.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const totalPractices = SAMPLE_PLANS.reduce((s, p) => s + p.body.practices.length, 0);
  const avgAnchorRatio = SAMPLE_PLANS.reduce((s, p) => s + p.anchor.ratio, 0) / SAMPLE_PLANS.length;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPwd }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      sessionStorage.setItem("crm_admin_auth", "1");
      if (data.token) sessionStorage.setItem("crm_admin_token", data.token);
      setIsAuthenticated(true);
      setLoginPwd("");
    } catch {
      alert("비밀번호가 틀렸습니다");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleLogin} className="glass-card p-8 w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#CC9965]/15 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-[#CC9965]" />
            </div>
            <h2 className="text-lg font-bold text-white">영상 기획 공장</h2>
            <p className="text-sm text-white/40">관리자 비밀번호를 입력하세요</p>
          </div>
          <Input
            type="password"
            placeholder="비밀번호"
            value={loginPwd}
            onChange={e => setLoginPwd(e.target.value)}
            className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
            autoFocus
          />
          <Button type="submit" disabled={isLoggingIn || !loginPwd} className="w-full bg-[#CC9965] hover:bg-[#CC9965]/80 text-black font-semibold">
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "로그인"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CC9965] to-[#CC9965]/60 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">영상 기획 공장</h1>
            <p className="text-white/50 text-sm">앵커 벤치마킹 → 역기획 → 인트로/본문/CTA 자동 생성</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "기획안", value: `${SAMPLE_PLANS.length}개`, icon: Lightbulb, color: "text-[#CC9965]" },
          { label: "실습 사례", value: `${totalPractices}개`, icon: PlayCircle, color: "text-blue-400" },
          { label: "평균 배율", value: `${avgAnchorRatio.toFixed(1)}x`, icon: TrendingUp, color: "text-orange-400" },
          { label: "레퍼런스", value: `${SAMPLE_PLANS.length + SAMPLE_PLANS.reduce((s,p)=>s+p.additionalRefs.length,0)}개`, icon: Film, color: "text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[11px] text-white/40 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 윤자동 방법론 */}
      <div className="glass-card p-5 bg-gradient-to-br from-[#CC9965]/[0.04] to-transparent">
        <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#CC9965]" /> 윤자동 영상 기획 7단계 방법론
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px]">
          {[
            { n: "1", t: "앵커 선정", d: "벤치마킹 1개 고정" },
            { n: "2", t: "근거 3축", d: "정량+SEO+구조" },
            { n: "3", t: "주제 리라이팅", d: "타겟+숫자+명령" },
            { n: "4", t: "가치 메세지", d: "누구에게 무엇을" },
            { n: "5", t: "인트로 3요소", d: "위기→공감→약속" },
            { n: "6", t: "본문 (실습 N개)", d: "세팅+실습+중간CTA" },
            { n: "7", t: "엔딩 3중 CTA", d: "리드+구독+댓글" },
          ].map(s => (
            <div key={s.n} className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-4 h-4 rounded-full bg-[#CC9965]/20 text-[#CC9965] text-[9px] flex items-center justify-center font-bold">{s.n}</span>
                <span className="text-white/70 font-semibold">{s.t}</span>
              </div>
              <p className="text-white/30 leading-tight">{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="기획안 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-white/30 hover:text-white/60" />
          </button>
        )}
      </div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Search className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">검색 결과가 없습니다</p>
          </div>
        ) : (
          plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isOpen={openPlanId === plan.id}
              onToggle={() => setOpenPlanId(openPlanId === plan.id ? null : plan.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
