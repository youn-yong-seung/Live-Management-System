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
    title: "클로드코드 시작 가이드",
    description: "설치부터 첫 자동화까지 한 번에",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
    url: "#",
  },
  {
    title: "노션 업무 템플릿 모음",
    description: "바로 복제해서 쓰는 실전 템플릿",
    icon: Download,
    color: "bg-purple-50 text-purple-600",
    url: "#",
  },
  {
    title: "자동화 아이디어 30선",
    description: "지금 바로 적용 가능한 자동화 리스트",
    icon: Zap,
    color: "bg-amber-50 text-amber-600",
    url: "#",
  },
];

/* ── Category config ────────────────────────────────── */

const CATEGORY_SECTIONS = [
  { label: "입문자 추천", tag: "입문", icon: Sparkles, color: "text-green-600 bg-green-50" },
  { label: "자동화", tag: "자동화", icon: Zap, color: "text-amber-600 bg-amber-50" },
  { label: "노션", tag: "노션", icon: BookOpen, color: "text-purple-600 bg-purple-50" },
  { label: "클로드코드", tag: "클로드코드", icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
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

  // Pick top 4 replays as "recommended"
  const recommended = replays.slice(0, 4);

  // Group by category
  const getByTag = (tag: string) =>
    replays.filter((r) => ((r as any).tags as string[] | null)?.includes(tag)).slice(0, 4);

  return (
    <div className="space-y-12">

      {/* ── Hero Section ──────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            무료 라이브 특강
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">
            AI와 자동화로<br />일하는 방식을 바꾸세요
          </h1>
          <p className="text-blue-100 text-sm sm:text-base mb-6 max-w-lg">
            클로드코드, 노션, Make 등 실전 툴을 활용한 무료 라이브 강의를 제공합니다.
            지금 바로 시작하세요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/lives">
              <span className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer">
                <Video className="h-4 w-4" />
                라이브 신청하기
              </span>
            </Link>
            <a
              href="https://open.kakao.com/o/gCM9Aehi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              무료 특강 대기방 참여하기
            </a>
          </div>
        </div>
      </div>

      {/* ── Upcoming Live Banner ──────────────────────── */}
      {scheduledLives && scheduledLives.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">예정된 라이브</h2>
            <Link href="/lives">
              <span className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer">
                전체 보기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduledLives.slice(0, 2).map((live) => (
              <div
                key={live.id}
                onClick={() => navigate("/lives")}
                className="bg-blue-50 border border-blue-100 rounded-2xl p-5 cursor-pointer hover:bg-blue-100/60 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">UPCOMING</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{live.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-1 mb-2">{live.description}</p>
                <span className="text-xs text-blue-600 font-medium">{formatDate(live.scheduledAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Free Resources ────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">무료 자료 나눔</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FREE_RESOURCES.map((res) => (
            <a
              key={res.title}
              href={res.url}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${res.color}`}>
                <res.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors">{res.title}</h3>
              <p className="text-xs text-gray-500">{res.description}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ── Recommended Replays ───────────────────────── */}
      {!isLoading && recommended.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">추천 다시보기</h2>
            </div>
            <Link href="/replays">
              <span className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer">
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
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden cursor-pointer"
                >
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt={replay.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">{replay.title}</h3>
                    {((replay as any).tags as string[] | null)?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {((replay as any).tags as string[]).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
                  <section.icon className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{section.label}</h2>
              </div>
              <Link href="/replays">
                <span className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer">
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
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden cursor-pointer"
                  >
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={replay.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{replay.title}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Loading State ─────────────────────────────── */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
