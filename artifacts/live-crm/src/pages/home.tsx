import { useState } from "react";
import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { ReplayModal } from "@/components/replay-modal";
import { Link } from "wouter";
import { useLocation } from "wouter";
import {
  PlayCircle, ArrowRight, MessageCircle, Download, Sparkles,
  Video, BookOpen, Zap, TrendingUp, Star,
} from "lucide-react";

/* ── Free Resources ─────────────────────────────────── */

const FREE_RESOURCES = [
  {
    title: "노션 템플릿 & 전자책",
    description: "할 일 관리, 가계부 등 무료 템플릿",
    icon: BookOpen,
    color: "text-purple-400",
    url: "/resources",
  },
  {
    title: "노션 왕초보 영상 강의",
    description: "처음 시작하는 분들을 위한 강의",
    icon: Download,
    color: "text-sky-400",
    url: "https://www.yunjadong.com/shop_view/?idx=159",
  },
  {
    title: "노션 무료 전자책",
    description: "기초부터 차근차근 알려주는 전자책",
    icon: Zap,
    color: "text-emerald-400",
    url: "https://www.notion.so/yunjadong/2b8ec2501aa180eeac9ee3e98904f630?v=2b8ec2501aa180d4b80b000cef37f646",
  },
];

/* ── Category config ────────────────────────────────── */

const CATEGORY_SECTIONS = [
  { label: "입문자 추천", tag: "입문", icon: Sparkles, color: "text-emerald-400" },
  { label: "자동화", tag: "자동화", icon: Zap, color: "text-amber-400" },
  { label: "노션", tag: "노션", icon: BookOpen, color: "text-purple-400" },
  { label: "클로드코드", tag: "클로드코드", icon: TrendingUp, color: "text-sky-400" },
];

/* ── Helpers ─────────────────────────────────────────── */

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function youtubeThumbnail(url: string) {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

/* ── Glass Card ──────────────────────────────────────── */

const gc = "glass-card";
const gcHover = "glass-card hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300";

/* ── Component ──────────────────────────────────────── */

export default function Home() {
  const [, navigate] = useLocation();
  const [modalReplay, setModalReplay] = useState<any>(null);

  const { data: endedLives, isLoading } = useGetLives(
    { status: "ended" },
    { query: { queryKey: getGetLivesQueryKey({ status: "ended" }) } }
  );

  const { data: scheduledLives } = useGetLives(
    { status: "scheduled" },
    { query: { queryKey: getGetLivesQueryKey({ status: "scheduled" }) } }
  );

  const replays = endedLives ?? [];
  const recommended = replays.slice(0, 4);
  const getByTag = (tag: string) =>
    replays.filter((r) => ((r as any).tags as string[] | null)?.includes(tag)).slice(0, 4);

  return (
    <div className="space-y-16">

      {/* ── Hero Section ──────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-3xl p-8 sm:p-12 ${gc} border-white/[0.08]`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a1a] via-[#071515] to-[#050A0A] opacity-80" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC9965]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#005051]/50 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-[#CC9965]/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 text-[#CC9965] border border-[#CC9965]/20">
            <Sparkles className="h-4 w-4" />
            무료 라이브 특강
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
            AI와 자동화로<br />일하는 방식을 바꾸세요
          </h1>
          <p className="text-white/60 text-sm sm:text-base mb-8 max-w-lg leading-relaxed">
            클로드코드, 노션, Make 등 실전 툴을 활용한 무료 라이브 강의를 제공합니다.
            지금 바로 시작하세요.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/lives">
              <span className="inline-flex items-center gap-2 bg-[#CC9965] text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#d4a570] transition-all cursor-pointer gold-glow">
                <Video className="h-4 w-4" />
                라이브 신청하기
              </span>
            </Link>
            <a
              href="https://open.kakao.com/o/gCM9Aehi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white/80 font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/5 hover:border-white/30 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              무료 특강 대기방 참여하기
            </a>
          </div>
        </div>
      </div>

      {/* ── Upcoming Live ─────────────────────────────── */}
      {scheduledLives && scheduledLives.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">예정된 라이브</h2>
            <Link href="/lives">
              <span className="text-sm text-[#CC9965] hover:text-[#d4a570] font-medium flex items-center gap-1 cursor-pointer">
                전체 보기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduledLives.slice(0, 2).map((live) => (
              <div
                key={live.id}
                onClick={() => navigate("/lives")}
                className={`${gcHover} p-6 cursor-pointer`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-[#CC9965] animate-pulse" />
                  <span className="text-xs font-bold text-[#CC9965] uppercase tracking-wide">UPCOMING</span>
                </div>
                <h3 className="font-bold text-white mb-1 line-clamp-1">{live.title}</h3>
                <p className="text-sm text-white/50 line-clamp-1 mb-3">{live.description}</p>
                <span className="text-xs text-[#CC9965]/80 font-medium">{formatDate(live.scheduledAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Free Resources ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">무료 자료 나눔</h2>
          <Link href="/resources">
            <span className="text-sm text-[#CC9965] hover:text-[#d4a570] font-medium flex items-center gap-1 cursor-pointer">
              전체 보기 <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {FREE_RESOURCES.map((res) => {
            const isExternal = res.url.startsWith("http");
            const inner = (
              <div className={`${gcHover} p-6 cursor-pointer group`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white/5 border border-white/10">
                  <res.icon className={`h-5 w-5 ${res.color}`} />
                </div>
                <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#CC9965] transition-colors">{res.title}</h3>
                <p className="text-xs text-white/40">{res.description}</p>
              </div>
            );
            return isExternal ? (
              <a key={res.title} href={res.url} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <Link key={res.title} href={res.url}>{inner}</Link>
            );
          })}
        </div>
      </div>

      {/* ── Recommended Replays ───────────────────────── */}
      {!isLoading && recommended.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[#CC9965]" />
              <h2 className="text-lg font-bold text-white">추천 다시보기</h2>
            </div>
            <Link href="/replays">
              <span className="text-sm text-[#CC9965] hover:text-[#d4a570] font-medium flex items-center gap-1 cursor-pointer">
                전체 보기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((replay) => {
              const thumb = replay.youtubeUrl ? youtubeThumbnail(replay.youtubeUrl) : null;
              return (
                <div
                  key={replay.id}
                  onClick={() => setModalReplay(replay)}
                  className={`${gcHover} overflow-hidden cursor-pointer group`}
                >
                  <div className="aspect-video bg-black/30 overflow-hidden relative">
                    {thumb ? (
                      <img src={thumb} alt={replay.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="h-8 w-8 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-[#CC9965]/90 rounded-full flex items-center justify-center shadow-lg">
                        <PlayCircle className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-2">{replay.title}</h3>
                    {((replay as any).tags as string[] | null)?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {((replay as any).tags as string[]).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/5">{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category Sections ─────────────────────────── */}
      {!isLoading && CATEGORY_SECTIONS.map((section) => {
        const items = getByTag(section.tag);
        if (items.length === 0) return null;
        return (
          <div key={section.tag}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10`}>
                  <section.icon className={`h-4 w-4 ${section.color}`} />
                </div>
                <h2 className="text-lg font-bold text-white">{section.label}</h2>
              </div>
              <Link href="/replays">
                <span className="text-sm text-[#CC9965] hover:text-[#d4a570] font-medium flex items-center gap-1 cursor-pointer">
                  더보기 <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((replay) => {
                const thumb = replay.youtubeUrl ? youtubeThumbnail(replay.youtubeUrl) : null;
                return (
                  <div
                    key={replay.id}
                    onClick={() => setModalReplay(replay)}
                    className={`${gcHover} overflow-hidden cursor-pointer group`}
                  >
                    <div className="aspect-video bg-black/30 overflow-hidden relative">
                      {thumb ? (
                        <img src={thumb} alt={replay.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="h-8 w-8 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">{replay.title}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Loading ─────────────────────────────────────── */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${gc} overflow-hidden`}>
              <Skeleton className="aspect-video w-full bg-white/5" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
