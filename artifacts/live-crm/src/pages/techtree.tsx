import { useState, useRef } from "react";
import { Star, Play, ChevronDown, Sparkles, ExternalLink, Users, MessageSquare } from "lucide-react";
import { ReplayModal } from "@/components/replay-modal";

/* ── Types ──────────────────────────────────────────── */

interface TreeNode {
  id: string;
  liveId: number;
  title: string;
  shortTitle: string;
  description: string;
  youtubeUrl: string;
  tags: string[];
  level: string;
  gains: string[];
  children?: string[];   // ids of next nodes
}

interface TreePath {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  glowColor: string;
  nodes: TreeNode[];
}

/* ── Tech Tree Data ─────────────────────────────────── */

const PATHS: TreePath[] = [
  {
    id: "notion",
    name: "노션 마스터",
    emoji: "📝",
    description: "노션 왕초보에서 업무 시스템 구축까지",
    color: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.3)",
    nodes: [
      {
        id: "n1", liveId: 10, level: "Lv.1 입문",
        title: "노션 포기자를 위한 초특급 쉬운 설명회",
        shortTitle: "노션 입문",
        description: "노션을 포기했던 분들을 위한 초특급 쉬운 노션 설명회",
        youtubeUrl: "https://www.youtube.com/watch?v=7IIynOrHJc4",
        tags: ["노션", "입문"], gains: ["노션 기본 개념 이해", "페이지 만들기", "블록 사용법"],
        children: ["n2"],
      },
      {
        id: "n2", liveId: 18, level: "Lv.2 기초",
        title: "프락과 함께하는 노션 할 일 관리 설명회",
        shortTitle: "할 일 관리",
        description: "신입사원 프락이 직접 알려주는 노션 할 일 관리 시스템",
        youtubeUrl: "https://www.youtube.com/watch?v=yy5tW_zRAaM",
        tags: ["노션", "생산성"], gains: ["할 일 관리 시스템 구축", "체크박스/캘린더 활용", "일일 루틴 관리"],
        children: ["n3"],
      },
      {
        id: "n3", liveId: 11, level: "Lv.3 중급",
        title: "노션 데이터베이스 - 넌 이제 내꺼야!",
        shortTitle: "데이터베이스",
        description: "노션 데이터베이스를 완벽하게 마스터하는 라이브",
        youtubeUrl: "https://www.youtube.com/watch?v=3b9_4gY8pLw",
        tags: ["노션", "데이터베이스"], gains: ["DB 생성/관리", "필터/정렬 마스터", "관계형 데이터 연결"],
        children: ["n4", "n5"],
      },
      {
        id: "n4", liveId: 12, level: "Lv.4 활용",
        title: "노션으로 만드는 직원 급여 관리 시스템",
        shortTitle: "급여 시스템",
        description: "노션으로 직원 급여 관리 시스템을 만드는 무료 특강",
        youtubeUrl: "https://www.youtube.com/watch?v=30r5T0T2JkQ",
        tags: ["노션", "시스템구축"], gains: ["실전 업무 시스템", "자동 계산 수식", "팀 운영 노하우"],
      },
      {
        id: "n5", liveId: 7, level: "Lv.4 고급",
        title: "Notion + Replit 업무 효율 200% 시스템",
        shortTitle: "노션+코딩",
        description: "윤자동 X 노션다움 - Notion + Replit을 활용한 시스템",
        youtubeUrl: "https://www.youtube.com/watch?v=OHIubNDuJ1I",
        tags: ["노션", "자동화"], gains: ["노션+코드 연동", "자동화 시스템 구축", "200% 업무 효율"],
      },
    ],
  },
  {
    id: "claude",
    name: "AI 코딩",
    emoji: "🤖",
    description: "AI 코딩 입문에서 자동화 시스템까지",
    color: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.3)",
    nodes: [
      {
        id: "c1", liveId: 5, level: "Lv.1 입문",
        title: "Claude Code <기초편> - 설치부터 시작",
        shortTitle: "클코 설치",
        description: "나를 위해 일하는 AI, 설치부터 어려우신 분들만",
        youtubeUrl: "https://www.youtube.com/watch?v=L75Sa_mukpM",
        tags: ["클로드코드", "AI", "입문"], gains: ["Claude Code 설치", "기본 명령어", "첫 자동화 체험"],
        children: ["c2", "c3"],
      },
      {
        id: "c2", liveId: 6, level: "Lv.2 활용",
        title: "Claude Code <활용편> - 카드뉴스 자동화",
        shortTitle: "카드뉴스 자동화",
        description: "카드뉴스 만들기에 지친 마케터, 1인 사업가분들",
        youtubeUrl: "https://www.youtube.com/watch?v=e4CWO_5mhpA",
        tags: ["클로드코드", "자동화", "마케팅"], gains: ["카드뉴스 자동 생성", "프롬프트 엔지니어링", "실전 워크플로"],
      },
      {
        id: "c3", liveId: 15, level: "Lv.2 분기",
        title: "커서AI 설치부터 기본사용법까지",
        shortTitle: "커서AI",
        description: "Cursor AI 설치 및 기본 사용법 튜토리얼",
        youtubeUrl: "https://www.youtube.com/watch?v=vOn9S4zh1Qs",
        tags: ["AI", "튜토리얼"], gains: ["Cursor AI 설치", "AI 코딩 보조 활용", "생산성 극대화"],
        children: ["c4"],
      },
      {
        id: "c4", liveId: 16, level: "Lv.3 심화",
        title: "구글 제미나이 3 완전 공개!",
        shortTitle: "제미나이",
        description: "조쉬 X 윤자동 — 나노바나나 pro, 안티그래비티까지",
        youtubeUrl: "https://www.youtube.com/watch?v=lMLxRYUFueM",
        tags: ["AI", "생산성"], gains: ["최신 AI 모델 비교", "실사용 리뷰", "AI 활용 인사이트"],
      },
    ],
  },
  {
    id: "business",
    name: "사업가",
    emoji: "💼",
    description: "마케팅 기초부터 매출 극대화까지",
    color: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.3)",
    nodes: [
      {
        id: "b1", liveId: 4, level: "Lv.1 입문",
        title: "마케팅 / 고객관리 기초편",
        shortTitle: "마케팅 기초",
        description: "마케팅과 고객관리의 기초를 배우는 라이브",
        youtubeUrl: "https://www.youtube.com/live/9tCmu_E4RdY",
        tags: ["마케팅", "고객관리"], gains: ["마케팅 기본 개념", "CRM 이해", "고객 관리 전략"],
        children: ["b2", "b3"],
      },
      {
        id: "b2", liveId: 20, level: "Lv.2 실전",
        title: "마케팅 자동화? 나민수님 초대석",
        shortTitle: "마케팅 자동화",
        description: "마케팅 자동화 전문가 나민수님을 초대한 특별 라이브",
        youtubeUrl: "https://www.youtube.com/watch?v=jboErkZ8_CI",
        tags: ["마케팅", "자동화"], gains: ["마케팅 자동화 전략", "툴 활용법", "전문가 인사이트"],
        children: ["b4"],
      },
      {
        id: "b3", liveId: 21, level: "Lv.2 전략",
        title: "3억 매출 마자이너의 차별화 전략",
        shortTitle: "차별화 전략",
        description: "김찬섭 대표님 인터뷰 — 디자인+마케팅 결합 전략",
        youtubeUrl: "https://www.youtube.com/watch?v=ErgYbRFHM08",
        tags: ["마케팅", "사업"], gains: ["차별화 전략 수립", "디자인+마케팅 결합", "매출 성장 노하우"],
        children: ["b4"],
      },
      {
        id: "b4", liveId: 9, level: "Lv.3 실전",
        title: "2일 만에 1억 벌은 그의 사업 과정",
        shortTitle: "1억 사업",
        description: "사업 과정을 실시간으로 공개하는 특별한 라이브",
        youtubeUrl: "https://www.youtube.com/watch?v=0VjUv74XbDA",
        tags: ["사업", "수익화"], gains: ["실전 사업 과정", "빠른 수익화 전략", "실행력 극대화"],
      },
    ],
  },
  {
    id: "automation",
    name: "자동화",
    emoji: "⚡",
    description: "반복 업무를 자동화로 해방",
    color: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.3)",
    nodes: [
      {
        id: "a1", liveId: 8, level: "Lv.1 입문",
        title: "퇴근이 빨라지는 Make 자동화 꿀팁 3가지",
        shortTitle: "Make 입문",
        description: "Make를 활용한 업무 자동화 꿀팁 3가지",
        youtubeUrl: "https://www.youtube.com/watch?v=J5Gu0aUcJoM",
        tags: ["Make", "자동화"], gains: ["Make 기본 사용법", "3가지 자동화 레시피", "퇴근 시간 단축"],
        children: ["a2", "a3"],
      },
      {
        id: "a2", liveId: 22, level: "Lv.2 실전",
        title: "플라우드노트 프로 회의록 자동화 끝판왕",
        shortTitle: "회의록 자동화",
        description: "Zapier + 노션 연동 회의록 자동화 완벽 가이드",
        youtubeUrl: "https://www.youtube.com/watch?v=KSI19aPorh0",
        tags: ["자동화", "노션"], gains: ["회의록 자동 생성", "Zapier 연동", "노션 자동 정리"],
        children: ["a4"],
      },
      {
        id: "a3", liveId: 17, level: "Lv.2 활용",
        title: "윤자동 회사 MZ 막내를 소개합니다",
        shortTitle: "실무 자동화",
        description: "Notion과 Make를 활용한 실무 자동화 소개",
        youtubeUrl: "https://www.youtube.com/watch?v=7IIynOrHJc4",
        tags: ["노션", "Make"], gains: ["실무 자동화 사례", "노션+Make 연동", "팀 업무 효율화"],
        children: ["a4"],
      },
      {
        id: "a4", liveId: 19, level: "Lv.3 고급",
        title: "AI 자동화로 성장한 샘 호트만 비즈니스 비밀",
        shortTitle: "AI 자동화 비즈니스",
        description: "AI 자동화를 활용해 성장한 비즈니스 노하우 대공개",
        youtubeUrl: "https://www.youtube.com/watch?v=HEQYMBBJLbI",
        tags: ["AI", "자동화", "사업"], gains: ["AI 자동화 비즈니스 전략", "스케일업 방법", "미래 자동화 트렌드"],
      },
    ],
  },
  {
    id: "excel",
    name: "엑셀",
    emoji: "📊",
    description: "엑셀로 업무 자동화 시작하기",
    color: "#22C55E",
    glowColor: "rgba(34, 197, 94, 0.3)",
    nodes: [
      {
        id: "e1", liveId: 13, level: "Lv.1 입문",
        title: "클릭만 하면 내용이 바뀌는 엑셀 대시보드 만들기",
        shortTitle: "엑셀 대시보드",
        description: "초딩도 가능! 조회수 81만회 엑셀 대시보드 튜토리얼",
        youtubeUrl: "https://www.youtube.com/watch?v=pvcKY3EB_D0",
        tags: ["엑셀", "튜토리얼"], gains: ["엑셀 대시보드 제작", "피벗테이블 기초", "데이터 시각화"],
        children: ["e2"],
      },
      {
        id: "e2", liveId: 14, level: "Lv.2 활용",
        title: "재고관리 프로그램 사지 말고 직접 만들어 쓰세요",
        shortTitle: "재고관리",
        description: "조회수 36만회 — 엑셀로 재고관리 프로그램 직접 제작",
        youtubeUrl: "https://www.youtube.com/watch?v=jTJ6LSqrtlo",
        tags: ["엑셀", "자동화"], gains: ["재고관리 시스템 구축", "VBA 매크로 기초", "실전 업무 자동화"],
      },
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────── */

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

/* ── Tooltip Component ──────────────────────────────── */

function NodeTooltip({ node, color }: { node: TreeNode; color: string }) {
  const ytId = extractYoutubeId(node.youtubeUrl);
  return (
    <div className="absolute z-50 w-[320px] left-1/2 -translate-x-1/2 bottom-full mb-3 pointer-events-none">
      <div className="bg-[rgba(5,10,10,0.97)] backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
        {/* Thumbnail */}
        {ytId && (
          <div className="aspect-video bg-black/50">
            <img
              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
              alt={node.title}
              className="w-full h-full object-cover opacity-90"
            />
          </div>
        )}
        <div className="p-4">
          {/* Level badge */}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {node.level}
          </span>
          <h4 className="text-sm font-bold text-white mt-1.5 mb-1 leading-snug">{node.title}</h4>
          <p className="text-xs text-white/40 mb-3">{node.description}</p>

          {/* Gains */}
          <div className="space-y-1.5 mb-3">
            <p className="text-[10px] font-semibold text-[#CC9965] uppercase tracking-wider">습득 스킬</p>
            {node.gains.map((g) => (
              <div key={g} className="flex items-center gap-2 text-xs text-white/60">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                {g}
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {node.tags.map((t) => (
              <span key={t} className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/5">{t}</span>
            ))}
          </div>
        </div>
      </div>
      {/* Arrow */}
      <div className="w-3 h-3 bg-[rgba(5,10,10,0.97)] border-b border-r border-white/10 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
    </div>
  );
}

/* ── Tree Node Component ────────────────────────────── */

function TreeNodeCircle({
  node, color, glowColor, isActive, onClick, onHover, onLeave, showTooltip
}: {
  node: TreeNode; color: string; glowColor: string;
  isActive: boolean; onClick: () => void;
  onHover: () => void; onLeave: () => void; showTooltip: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center" onMouseEnter={onHover} onMouseLeave={onLeave}>
      {showTooltip && <NodeTooltip node={node} color={color} />}
      <button
        onClick={onClick}
        className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 group cursor-pointer"
        style={{
          background: isActive ? `${color}30` : "rgba(255,255,255,0.05)",
          border: `2px solid ${isActive ? color : "rgba(255,255,255,0.1)"}`,
          boxShadow: isActive ? `0 0 20px ${glowColor}` : "none",
        }}
      >
        <Play className="h-5 w-5 transition-colors" style={{ color: isActive ? color : "rgba(255,255,255,0.3)" }} />
        {/* Level pip */}
        <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: isActive ? color : "rgba(255,255,255,0.1)", color: isActive ? "#050A0A" : "rgba(255,255,255,0.4)" }}>
          {node.level.split(" ")[0]}
        </span>
      </button>
      <span className={`mt-2 text-xs font-medium text-center max-w-[100px] leading-tight ${isActive ? "text-white" : "text-white/40"}`}>
        {node.shortTitle}
      </span>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

export default function TechTree() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [modalReplay, setModalReplay] = useState<{ id: number; title: string; description: string | null; youtubeUrl: string | null; tags?: string[] | null } | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const currentPath = PATHS.find((p) => p.id === selectedPath);

  const handleNodeClick = (node: TreeNode) => {
    setActiveNodes((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      return next;
    });
    setModalReplay({
      id: node.liveId,
      title: node.title,
      description: node.description,
      youtubeUrl: node.youtubeUrl,
      tags: node.tags,
    });
  };

  const handleSelectPath = (pathId: string) => {
    setSelectedPath(pathId);
    setActiveNodes(new Set());
    setHoveredNode(null);
    setTimeout(() => {
      treeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Group nodes into levels for rendering
  const getLevels = (path: TreePath) => {
    const levels: TreeNode[][] = [];
    const placed = new Set<string>();

    // BFS by parent→children
    let queue = [path.nodes[0]];
    while (queue.length > 0) {
      const level: TreeNode[] = [];
      const nextQueue: TreeNode[] = [];
      for (const node of queue) {
        if (placed.has(node.id)) continue;
        placed.add(node.id);
        level.push(node);
        if (node.children) {
          for (const childId of node.children) {
            const child = path.nodes.find((n) => n.id === childId);
            if (child && !placed.has(child.id)) nextQueue.push(child);
          }
        }
      }
      if (level.length > 0) levels.push(level);
      queue = nextQueue;
    }

    // Add any remaining nodes
    for (const node of path.nodes) {
      if (!placed.has(node.id)) {
        levels.push([node]);
        placed.add(node.id);
      }
    }

    return levels;
  };

  /* Arc offset for each node position */
  const arcOffsets = [24, 8, 0, 8, 24];

  return (
    <div className="space-y-16">
      {/* Header */}
      <div className="pt-4 text-center">
        <p className="text-[#00E5E5]/60 text-xs font-semibold uppercase tracking-[0.2em] mb-3">SKILL TREE</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3" style={{ textShadow: "0 0 40px rgba(0,229,229,0.15)" }}>테크트리</h1>
        <p className="text-white/40 text-sm max-w-md mx-auto">시작 지점을 선택하고 나만의 성장 루트를 따라가세요</p>
      </div>

      {/* ── Arc Path Selector ────────────────────────── */}
      <div className="relative py-8">
        {/* Background constellation pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="w-full h-full opacity-[0.04]" viewBox="0 0 800 200">
            <circle cx="80" cy="40" r="1.5" fill="#00E5E5" />
            <circle cx="200" cy="120" r="1" fill="#00E5E5" />
            <circle cx="350" cy="30" r="1.5" fill="#00E5E5" />
            <circle cx="500" cy="150" r="1" fill="#00E5E5" />
            <circle cx="650" cy="60" r="1.5" fill="#00E5E5" />
            <circle cx="720" cy="160" r="1" fill="#00E5E5" />
            <line x1="80" y1="40" x2="200" y2="120" stroke="#00E5E5" strokeWidth="0.5" />
            <line x1="200" y1="120" x2="350" y2="30" stroke="#00E5E5" strokeWidth="0.5" />
            <line x1="350" y1="30" x2="500" y2="150" stroke="#00E5E5" strokeWidth="0.5" />
            <line x1="500" y1="150" x2="650" y2="60" stroke="#00E5E5" strokeWidth="0.5" />
            <line x1="650" y1="60" x2="720" y2="160" stroke="#00E5E5" strokeWidth="0.5" />
            <circle cx="140" cy="160" r="0.8" fill="#00E5E5" />
            <circle cx="420" cy="100" r="0.8" fill="#00E5E5" />
            <circle cx="580" cy="40" r="0.8" fill="#00E5E5" />
            <line x1="140" y1="160" x2="200" y2="120" stroke="#00E5E5" strokeWidth="0.3" />
            <line x1="420" y1="100" x2="500" y2="150" stroke="#00E5E5" strokeWidth="0.3" />
          </svg>
        </div>

        {/* Connecting arc line */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[80%] max-w-[700px] pointer-events-none">
          <svg viewBox="0 0 700 60" className="w-full opacity-20">
            <path d="M 30 50 Q 175 0 350 30 Q 525 60 670 10" fill="none" stroke="url(#arcGrad)" strokeWidth="1" />
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5E5" stopOpacity="0" />
                <stop offset="30%" stopColor="#00E5E5" stopOpacity="1" />
                <stop offset="70%" stopColor="#0066FF" stopOpacity="1" />
                <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Nodes */}
        <div className="flex justify-center items-end gap-6 sm:gap-10 lg:gap-14 relative z-10">
          {PATHS.map((path, i) => {
            const isSelected = selectedPath === path.id;
            return (
              <div
                key={path.id}
                className="flex flex-col items-center group cursor-pointer relative"
                style={{ transform: `translateY(${arcOffsets[i]}px)` }}
                onClick={() => handleSelectPath(path.id)}
              >
                {/* Glow ring */}
                <div
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    background: isSelected
                      ? "rgba(0, 229, 229, 0.12)"
                      : "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(12px)",
                    border: isSelected
                      ? "1.5px solid rgba(0, 229, 229, 0.5)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: isSelected
                      ? "0 0 30px rgba(0, 229, 229, 0.25), 0 0 60px rgba(0, 229, 229, 0.1), inset 0 0 20px rgba(0, 229, 229, 0.05)"
                      : "0 4px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Icon — thin line style */}
                  <span className="text-2xl sm:text-3xl transition-transform duration-300 group-hover:scale-110">{path.emoji}</span>

                  {/* Outer pulse for selected */}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                      style={{ border: "1px solid rgba(0, 229, 229, 0.4)" }} />
                  )}
                </div>

                {/* Label */}
                <span className={`mt-3 text-xs font-semibold transition-colors duration-300 ${
                  isSelected ? "text-[#00E5E5]" : "text-white/40 group-hover:text-white/70"
                }`}>
                  {path.name}
                </span>

                {/* Hover detail popup */}
                <div className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 w-[180px] pointer-events-none transition-all duration-300 ${
                  isSelected ? "opacity-0 translate-y-0" : "opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2"
                }`}>
                  <div className="rounded-xl p-3 text-center"
                    style={{
                      background: "rgba(0, 40, 50, 0.9)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(0, 229, 229, 0.15)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                    <p className="text-[10px] text-[#00E5E5]/70 font-medium">{path.nodes.length}개 강의</p>
                    <p className="text-[11px] text-white/50 mt-0.5">{path.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tree */}
      {currentPath && (
        <div ref={treeRef} className="p-6 sm:p-10 rounded-2xl" style={{ background: "rgba(0, 80, 81, 0.2)", backdropFilter: "blur(16px) saturate(180%)", border: "1px solid rgba(0, 80, 81, 0.3)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5)" }}>
          {/* Path header */}
          <div className="text-center mb-10">
            <span className="text-3xl mb-3 block">{currentPath.emoji}</span>
            <h2 className="text-xl font-bold text-white mb-1" style={{ textShadow: `0 0 30px ${currentPath.glowColor}` }}>{currentPath.name} 테크트리</h2>
            <p className="text-xs text-white/40">{currentPath.description}</p>
            <div className="mt-4 mx-auto w-24 h-px" style={{ background: `linear-gradient(to right, transparent, ${currentPath.color}60, transparent)` }} />
          </div>

          {/* Levels */}
          <div className="flex flex-col items-center gap-2">
            {getLevels(currentPath).map((level, li) => (
              <div key={li}>
                {/* Connection line from above */}
                {li > 0 && (
                  <div className="flex justify-center mb-2">
                    <div className="w-px h-10 relative">
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(to bottom, ${currentPath.color}40, ${currentPath.color}15)`
                      }} />
                    </div>
                  </div>
                )}

                {/* Branch indicator */}
                {level.length > 1 && (
                  <div className="flex justify-center mb-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold"
                      style={{ background: `${currentPath.color}15`, color: currentPath.color, border: `1px solid ${currentPath.color}30` }}>
                      <Sparkles className="h-3 w-3" />
                      분기점 — 선택하세요
                    </div>
                  </div>
                )}

                {/* Nodes */}
                <div className="flex justify-center gap-8 sm:gap-16">
                  {level.map((node) => (
                    <TreeNodeCircle
                      key={node.id}
                      node={node}
                      color={currentPath.color}
                      glowColor={currentPath.glowColor}
                      isActive={activeNodes.has(node.id)}
                      onClick={() => handleNodeClick(node)}
                      onHover={() => setHoveredNode(node.id)}
                      onLeave={() => setHoveredNode(null)}
                      showTooltip={hoveredNode === node.id}
                    />
                  ))}
                </div>

                {/* Branching lines */}
                {level.length > 1 && li > 0 && (
                  <div className="flex justify-center -mt-1">
                    <div className="h-px" style={{
                      width: `${(level.length - 1) * 8}rem`,
                      background: `linear-gradient(to right, transparent, ${currentPath.color}30, transparent)`
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completion */}
          <div className="text-center mt-12 pt-8 border-t border-white/[0.06]">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: `${currentPath.color}15`, color: currentPath.color, border: `1px solid ${currentPath.color}30` }}>
              <Star className="h-3.5 w-3.5" />
              {activeNodes.size}/{currentPath.nodes.length} 완료
            </div>
            <p className="text-xs text-white/30 mt-3">
              노드를 클릭하면 영상이 열립니다. 마우스를 올려 강의 정보를 미리 확인하세요.
            </p>
          </div>
        </div>
      )}

      {/* CTA when no path selected */}
      {!selectedPath && (
        <div className="text-center py-10">
          <ChevronDown className="h-6 w-6 text-white/20 mx-auto animate-bounce" />
          <p className="text-sm text-white/30 mt-2">위에서 시작할 테크트리를 선택하세요</p>
        </div>
      )}

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
