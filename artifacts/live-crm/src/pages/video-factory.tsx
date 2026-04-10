import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ExternalLink, TrendingUp, Users, Eye, Calendar,
  SlidersHorizontal, ChevronDown, ChevronUp, Lightbulb,
  Film, Zap, Target, ArrowUpDown, X, Filter, Clapperboard, Lock, Loader2
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
  thumbnail: string;
}

interface PlanCluster {
  id: string;
  topic: string;
  thumbTitle: string;
  thumbSub: string;
  videoTitle: string;
  targetAudience: string;
  concept: string;
  differentiator: string;
  refs: VideoRef[];
}

// ─── Helpers ───
function toKr(n: number) {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "천";
  return n.toString();
}

function daysAgo(dateStr: string) {
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

// ─── Sample Data (벤치마킹 시트 + 직접 수집 데이터) ───
const SAMPLE_CLUSTERS: PlanCluster[] = [
  {
    id: "remotion",
    topic: "Claude Code + Remotion 영상 공장",
    thumbTitle: "영상 공장",
    thumbSub: "클로드코드 하나로 편집자 없이 영상 양산",
    videoTitle: "클로드코드 + Remotion으로 편집 없이 영상 만드는 법 (설치부터 완성까지)",
    targetAudience: "AI에 관심있는 크리에이터, 영상 편집에 시간 쓰기 싫은 1인 사업자",
    concept: "Remotion 스킬 설치 → 프롬프트 한 줄로 모션그래픽 영상 완성까지 전 과정 라이브. 2026년 1월 출시 후 X에서 600만뷰, 25,000+ 설치. 한국어 영상 부족으로 선점 효과.",
    differentiator: "비개발자 시점에서 React 몰라도 가능하다는 걸 증명. 윤자동 채널 실제 쇼츠/인트로를 Remotion으로 제작해서 보여주기.",
    refs: [
      { id: "idVMGLzrrnU", title: "Claude Code Just Changed YouTube Videos Forever (Tutorial)", channel: "Danny Why", views: 219000, subs: 126000, ratio: 1.7, uploadDate: "2026-03-29", url: "https://www.youtube.com/watch?v=idVMGLzrrnU", thumbnail: "" },
      { id: "arrKfg0V268", title: "이제 클로드 코드가 기획자이자 편집자입니다. 100% 자동화", channel: "빌더 조쉬", views: 35000, subs: 46000, ratio: 0.8, uploadDate: "2026-04-04", url: "https://www.youtube.com/watch?v=arrKfg0V268", thumbnail: "" },
      { id: "remotion-5pm", title: "🔥 실용성 미쳤다! 클로드 코드 + Remotion = 영상 공장 완성", channel: "오후다섯씨", views: 10000, subs: 51700, ratio: 0.2, uploadDate: "2026-02-10", url: "", thumbnail: "" },
      { id: "remotion-3d", title: "클로드 코드의 리모션을 사용한 완전한 3D 애니메이션", channel: "소형채널", views: 19000, subs: 15800, ratio: 1.2, uploadDate: "2026-03-10", url: "", thumbnail: "" },
      { id: "remotion-mg", title: "Create Motion Graphics with Claude Code + Remotion", channel: "해외채널", views: 47000, subs: 51400, ratio: 0.9, uploadDate: "2026-02-10", url: "", thumbnail: "" },
    ],
  },
  {
    id: "claude-skill",
    topic: "클로드 코워크/스킬 완전 정복",
    thumbTitle: "20배",
    thumbSub: "99%가 모르는 클로드 숨겨진 기능 3가지",
    videoTitle: "클로드 코워크 + 스킬 완전 정복 | 업무 생산성 20배 올리는 설정법 총정리",
    targetAudience: "클로드 유료 사용자, 업무 효율화에 관심있는 직장인",
    concept: "클로드의 코워크/스킬/프로젝트 기능을 총정리하는 완전 가이드. 구독자 8천 채널이 9.7만뷰(12x배율) 달성한 검증된 수요.",
    differentiator: "코워크 + 스킬 + Claude Code를 하나의 영상에서 전부 다루는 올인원. 윤자동 실제 업무 적용 사례(카드뉴스 자동화, 영상 기획) 공개.",
    refs: [
      { id: "claude-skill-1", title: "AI 잘쓰는 사람들이 요즘 클로드 스킬에 미쳐있는 이유 | 200% 활용법 전부 공개", channel: "소형채널(8천)", views: 97000, subs: 8000, ratio: 12.1, uploadDate: "2026-04-02", url: "", thumbnail: "" },
      { id: "claude-skill-2", title: "AI 잘 쓰는 사람들이 클로드 스킬 먼저 세팅하는 이유", channel: "중형채널(14.6만)", views: 520000, subs: 146000, ratio: 3.6, uploadDate: "2026-03-10", url: "", thumbnail: "" },
      { id: "claude-prod", title: "클로드로 업무 생산성 20배 올리는 제일 쉬운 방법", channel: "로사장(2.4만)", views: 110000, subs: 24000, ratio: 4.5, uploadDate: "2026-04-02", url: "", thumbnail: "" },
      { id: "claude-cowork", title: "클로드 코워크로 업무 10배 빨라지는 방법", channel: "소형채널(1.8만)", views: 39000, subs: 18000, ratio: 2.2, uploadDate: "2026-03-27", url: "", thumbnail: "" },
      { id: "claude-web", title: "클로드 코드로 10분 만에 역대급 디자인의 웹사이트 만드는법", channel: "소형채널(1만)", views: 50000, subs: 10000, ratio: 5.0, uploadDate: "2026-03-28", url: "", thumbnail: "" },
    ],
  },
  {
    id: "gemini-gems",
    topic: "Gemini Gems 업무 자동화",
    thumbTitle: "야근 탈출",
    thumbSub: "제미나이 숨겨진 기능 GEM 하나로",
    videoTitle: "99%가 모르는 제미나이 Gems 활용법 | 나만의 AI 업무 도구 만들기 (무료)",
    targetAudience: "구글 워크스페이스 사용자, AI 무료 도구 선호 직장인",
    concept: "제미나이 Gems로 나만의 커스텀 AI 도구를 만들어 업무 자동화. 3만 채널 24만뷰(8x배율) 달성. NotebookLM + Gemini 통합 업데이트도 다루면 시너지.",
    differentiator: "Gems로 '윤자동 콘텐츠 기획 도구' 실제 제작 시연. Claude Projects vs Gemini Gems vs ChatGPT GPTs 3종 비교 앵글.",
    refs: [
      { id: "gem-1", title: "제미나이 숨겨진 기능 'GEM'으로 야근탈출! 나만의 AI 업무 자동화 도구 만들기", channel: "소형채널(3만)", views: 240000, subs: 30000, ratio: 8.0, uploadDate: "2026-03-10", url: "", thumbnail: "" },
      { id: "gem-2", title: "(무료 자료 제공) 99%가 모르는 Gemini 3 설정법 7가지!", channel: "소형채널(1.83만)", views: 27000, subs: 18300, ratio: 1.5, uploadDate: "2026-01-10", url: "", thumbnail: "" },
      { id: "gem-3", title: "NotebookLM and Gemini Just Merged (Massive Update)", channel: "해외채널(35만)", views: 77000, subs: 350000, ratio: 0.2, uploadDate: "2026-04-09", url: "", thumbnail: "" },
    ],
  },
];

// ─── Components ───

function VideoCard({ video }: { video: VideoRef }) {
  const thumb = video.thumbnail || (extractVideoId(video.url) ? `https://img.youtube.com/vi/${extractVideoId(video.url)}/mqdefault.jpg` : null);

  return (
    <a
      href={video.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`group glass-card overflow-hidden transition-all duration-300 ${video.url ? "hover:bg-white/[0.06] hover:-translate-y-0.5 cursor-pointer" : "opacity-80"}`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-white/[0.03] relative overflow-hidden">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-white/20" />
          </div>
        )}
        {/* Ratio badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-md bg-black/60 ${ratioColor(video.ratio)}`}>
          {video.ratio.toFixed(1)}x
        </div>
      </div>
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-medium text-white/90 line-clamp-2 leading-snug">{video.title}</p>
        <div className="flex items-center justify-between text-[11px] text-white/40">
          <span className="truncate">{video.channel}</span>
          {video.url && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/30">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{toKr(video.views)}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{toKr(video.subs)}</span>
          {video.uploadDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{daysAgo(video.uploadDate)}</span>}
        </div>
      </div>
    </a>
  );
}

function PlanCard({ plan, isOpen, onToggle }: { plan: PlanCluster; isOpen: boolean; onToggle: () => void }) {
  const avgRatio = plan.refs.reduce((s, r) => s + r.ratio, 0) / plan.refs.length;
  const maxViews = Math.max(...plan.refs.map(r => r.views));

  return (
    <div className="glass-card overflow-hidden">
      {/* Header — always visible */}
      <button onClick={onToggle} className="w-full text-left p-5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-[#CC9965]/40 text-[#CC9965] text-[10px]">
                레퍼런스 {plan.refs.length}개
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/50 text-[10px]">
                평균 {avgRatio.toFixed(1)}x
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/50 text-[10px]">
                최고 {toKr(maxViews)}뷰
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{plan.topic}</h3>
            <p className="text-sm text-white/50">{plan.videoTitle}</p>
          </div>
          <div className="flex-shrink-0 pt-1">
            {isOpen ? <ChevronUp className="w-5 h-5 text-white/30" /> : <ChevronDown className="w-5 h-5 text-white/30" />}
          </div>
        </div>

        {/* Thumbnail Preview */}
        <div className="mt-4 flex gap-3">
          <div className="w-48 h-28 rounded-lg bg-gradient-to-br from-[#CC9965]/20 to-[#CC9965]/5 border border-[#CC9965]/20 flex flex-col items-center justify-center gap-1 flex-shrink-0">
            <span className="text-2xl font-black text-[#CC9965]">{plan.thumbTitle}</span>
            <span className="text-[10px] text-white/50 text-center px-2 leading-tight">{plan.thumbSub}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Target className="w-3.5 h-3.5" />
              <span>{plan.targetAudience}</span>
            </div>
            <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">{plan.concept}</p>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-white/[0.06]">
          {/* Differentiator */}
          <div className="px-5 py-4 bg-[#CC9965]/[0.03]">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-[#CC9965] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#CC9965] mb-1">윤자동 차별화 포인트</p>
                <p className="text-sm text-white/70 leading-relaxed">{plan.differentiator}</p>
              </div>
            </div>
          </div>

          {/* Reference Videos */}
          <div className="p-5">
            <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-1.5">
              <Film className="w-4 h-4" />
              레퍼런스 영상
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plan.refs.map(ref => (
                <VideoCard key={ref.id} video={ref} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function VideoFactory() {
  /* ── Admin auth gate ── */
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return sessionStorage.getItem("crm_admin_auth") === "1"; } catch { return false; }
  });
  const [loginPwd, setLoginPwd] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPwd }),
      });
      if (!res.ok) throw new Error("비밀번호가 틀렸습니다");
      const data = await res.json();
      sessionStorage.setItem("crm_admin_auth", "1");
      sessionStorage.setItem("crm_admin_token", data.token);
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

  /* ── Main state ── */
  const [openPlanId, setOpenPlanId] = useState<string | null>("remotion");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"ratio" | "views" | "recent">("ratio");

  const clusters = useMemo(() => {
    let filtered = SAMPLE_CLUSTERS;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.topic.toLowerCase().includes(q) ||
          c.videoTitle.toLowerCase().includes(q) ||
          c.refs.some(r => r.title.toLowerCase().includes(q) || r.channel.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [searchQuery]);

  // Stats
  const totalRefs = SAMPLE_CLUSTERS.reduce((s, c) => s + c.refs.length, 0);
  const totalViews = SAMPLE_CLUSTERS.flatMap(c => c.refs).reduce((s, r) => s + r.views, 0);
  const avgRatio = SAMPLE_CLUSTERS.flatMap(c => c.refs).reduce((s, r) => s + r.ratio, 0) / totalRefs;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CC9965] to-[#CC9965]/60 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">영상 기획 공장</h1>
            <p className="text-white/50 text-sm">레퍼런스 기반 영상 기획 시스템</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "기획안", value: `${SAMPLE_CLUSTERS.length}개`, icon: Lightbulb, color: "text-[#CC9965]" },
          { label: "레퍼런스", value: `${totalRefs}개`, icon: Film, color: "text-blue-400" },
          { label: "총 조회수", value: toKr(totalViews), icon: Eye, color: "text-green-400" },
          { label: "평균 배율", value: `${avgRatio.toFixed(1)}x`, icon: TrendingUp, color: "text-orange-400" },
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

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="기획안 또는 레퍼런스 검색..."
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
      </div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {clusters.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Search className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">검색 결과가 없습니다</p>
          </div>
        ) : (
          clusters.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isOpen={openPlanId === plan.id}
              onToggle={() => setOpenPlanId(openPlanId === plan.id ? null : plan.id)}
            />
          ))
        )}
      </div>

      {/* How it works */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#CC9965]" />
          기획 공장 사용법
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "주제 입력", desc: "촬영하고 싶은 주제나 키워드를 입력합니다" },
            { step: "2", title: "레퍼런스 자동 수집", desc: "구독자 대비 조회수가 높은 최신 영상을 자동으로 찾습니다" },
            { step: "3", title: "기획안 생성", desc: "썸네일 제목 + 영상 제목 + 차별화 포인트까지 완성합니다" },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#CC9965]/15 text-[#CC9965] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">{item.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
