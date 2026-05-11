import { useState, useEffect, useRef } from "react";
import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { ReplayModal } from "@/components/replay-modal";
import { Link } from "wouter";
import { useLocation } from "wouter";
import {
  PlayCircle, ArrowRight, MessageCircle, Download, Sparkles,
  Video, BookOpen, Zap, TrendingUp, Star, Heart, ExternalLink,
} from "lucide-react";

/* ── Free Resources ─────────────────────────────────── */

const FREE_RESOURCES = [
  {
    title: "N플레이스 자동 리뷰 답글",
    description: "자영업자 전용 AI 리뷰 자동 답글 프로그램",
    icon: Zap,
    color: "text-emerald-600",
    url: "https://www.yunjadong.com/shop_view?idx=127",
    badge: "무료",
  },
  {
    title: "카톡 자동발송기",
    description: "7일 무료 체험 — 단체발송, 예약발송",
    icon: MessageCircle,
    color: "text-sky-400",
    url: "https://www.yunjadong.com/shop_view?idx=66",
    badge: "무료체험",
  },
  {
    title: "노션 템플릿 & 전자책",
    description: "할 일 관리, 가계부 등 무료 템플릿",
    icon: BookOpen,
    color: "text-purple-400",
    url: "/resources",
    badge: "무료",
  },
];

/* ── Category config ────────────────────────────────── */

const CATEGORY_SECTIONS = [
  { label: "입문자 추천", tag: "입문", icon: Sparkles, color: "text-[#6366F1]" },
  { label: "자동화", tag: "자동화", icon: Zap, color: "text-[#6366F1]" },
  { label: "노션", tag: "노션", icon: BookOpen, color: "text-[#6366F1]" },
  { label: "클로드코드", tag: "클로드코드", icon: TrendingUp, color: "text-[#6366F1]" },
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
const gcHover = "glass-card hover:bg-[#eef0f3] hover:-translate-y-1 transition-all duration-300";

/* ── Scroll reveal hook ─────────────────────────────── */

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Component ──────────────────────────────────────── */

export default function Home() {
  const [, navigate] = useLocation();
  const [modalReplay, setModalReplay] = useState<any>(null);
  const declare = useReveal();

  const { data: endedLives, isLoading } = useGetLives(
    { status: "ended" },
    { query: { queryKey: getGetLivesQueryKey({ status: "ended" }) } }
  );

  const { data: scheduledLives } = useGetLives(
    { status: "scheduled" },
    { query: { queryKey: getGetLivesQueryKey({ status: "scheduled" }) } }
  );

  const { data: activeLives } = useGetLives(
    { status: "live" },
    { query: { queryKey: getGetLivesQueryKey({ status: "live" }) } }
  );

  const replays = endedLives ?? [];
  const recommended = replays.slice(0, 4);
  const getByTag = (tag: string) =>
    replays.filter((r) => ((r as any).tags as string[] | null)?.includes(tag)).slice(0, 4);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="section-band">
        <div className="section-band-inner text-center" style={{ paddingTop: "120px", paddingBottom: "120px" }}>
          <div className="inline-flex items-center gap-2 bg-[#eef2ff] rounded-full px-3 py-1 text-xs font-semibold mb-6 text-[#6366F1]">
            <Sparkles className="h-3.5 w-3.5" />
            무료 라이브 특강
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#111318] leading-[1.2] tracking-tight mb-5">
            AI와 자동화로<br />
            일하는 방식을 바꾸세요
          </h1>
          <p className="text-[#484d57] text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            클로드코드, 노션, Make 등 실전 툴을 활용한 무료 라이브 강의를 제공합니다.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/lives">
              <span className="inline-flex items-center gap-2 bg-[#111318] text-white font-semibold text-sm px-6 py-3.5 rounded-md hover:bg-[#1f2127] transition-all cursor-pointer">
                <Video className="h-4 w-4" />
                라이브 신청하기
              </span>
            </Link>
            <a
              href="https://open.kakao.com/o/gCM9Aehi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#e5e7eb] text-[#111318] font-semibold text-sm px-6 py-3.5 rounded-md hover:bg-[#f7f8fa] transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              무료 특강 대기방
            </a>
          </div>
        </div>
      </section>

      {/* ── DECLARATION (다크 풀폭) ──────────────────── */}
      <div className="declare-v2" ref={declare.ref}>
        <div className={`declare-v2-inner ${declare.visible ? "revealed" : ""}`}>
          <div className="declare-v2-icon">💡</div>
          <h2>
            <em>윤자동의 모든 강의를</em>
            <br />
            무료화 선언합니다.
          </h2>
          <p>
            우리는 B2B에서 돈을 법니다. 여러분한테 수익화하려는 목적이 1도 없습니다.
            <br />
            AI 시대에는 정보를 나눠야 가치가 있습니다. 여기 오시면 무조건 가져갈 것이 있게 만들겠습니다.
          </p>
          <div className="declare-v2-line" />
        </div>
      </div>

      {/* ── Live Now ─────────────────────────────────── */}
      {activeLives && activeLives.length > 0 && (
        <section className="section-band section-band-alt"><div className="section-band-inner">
          <h2 className="text-lg font-bold text-[#111318] mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            지금 라이브 중
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeLives.map((live) => (
              <div key={live.id} className="glass-card-gold hover:-translate-y-1 transition-all duration-300 p-6">
                <div className="cursor-pointer" onClick={() => setModalReplay(live)}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide">LIVE NOW</span>
                    <span className="text-xs text-[#a0a4ab]">{live.registrationCount}명 참석</span>
                  </div>
                  <h3 className="font-bold text-[#111318] mb-1 line-clamp-1 hover:text-[#6366F1] transition-colors">{live.title}</h3>
                  <p className="text-sm text-[#8b8f98] line-clamp-2 mb-3">{live.description}</p>
                </div>
                <div className="flex gap-2 pt-3 border-t border-[#eef0f3]">
                  {live.youtubeUrl && (
                    <a href={live.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-[#111318] text-xs font-bold py-2.5 rounded-lg transition-colors"
                      onClick={(e) => e.stopPropagation()}>
                      <PlayCircle className="h-3.5 w-3.5" /> 라이브 입장하기
                    </a>
                  )}
                  <button
                    className="flex-1 flex items-center justify-center gap-2 border border-[#e5e7eb] text-[#484d57] hover:text-[#6366F1] hover:border-[#6366F1]/30 text-xs font-bold py-2.5 rounded-lg transition-colors"
                    onClick={() => setModalReplay(live)}>
                    <Star className="h-3.5 w-3.5" /> 후기 작성하기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div></section>
      )}

      {/* ── Upcoming Live ─────────────────────────────── */}
      {scheduledLives && scheduledLives.length > 0 && (
        <section className="section-band"><div className="section-band-inner">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#111318]">예정된 라이브</h2>
            <Link href="/lives">
              <span className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium flex items-center gap-1 cursor-pointer">
                전체 보기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduledLives.slice(0, 2).map((live) => (
              <div
                key={live.id}
                onClick={() => navigate("/lives")}
                className="glass-card-gold hover:-translate-y-1 transition-all duration-300 p-6 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
                  <span className="text-xs font-bold text-[#6366F1] uppercase tracking-wide">UPCOMING</span>
                </div>
                <h3 className="font-bold text-[#111318] mb-1 line-clamp-1">{live.title}</h3>
                <p className="text-sm text-[#8b8f98] line-clamp-1 mb-3">{live.description}</p>
                <span className="text-xs text-[#6366F1]/80 font-medium">{formatDate(live.scheduledAt)}</span>
              </div>
            ))}
          </div>
        </div></section>
      )}

      {/* ── Free Resources ────────────────────────────── */}
      <section className="section-band section-band-alt"><div className="section-band-inner">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#111318]">무료 자료 나눔</h2>
          <Link href="/resources">
            <span className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium flex items-center gap-1 cursor-pointer">
              전체 보기 <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {FREE_RESOURCES.map((res) => {
            const isExternal = res.url.startsWith("http");
            const inner = (
              <div className={`${gcHover} p-6 cursor-pointer group`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f7f8fa] border border-[#e5e7eb]">
                    <res.icon className={`h-5 w-5 ${res.color}`} />
                  </div>
                  {(res as any).badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                      {(res as any).badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[#111318] text-sm mb-1 group-hover:text-[#6366F1] transition-colors">{res.title}</h3>
                <p className="text-xs text-[#8b8f98]">{res.description}</p>
              </div>
            );
            return isExternal ? (
              <a key={res.title} href={res.url} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <Link key={res.title} href={res.url}>{inner}</Link>
            );
          })}
        </div>
      </div></section>

      {/* ── Recommended Replays ───────────────────────── */}
      {!isLoading && recommended.length > 0 && (
        <section className="section-band"><div className="section-band-inner">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[#6366F1]" />
              <h2 className="text-lg font-bold text-[#111318]">추천 다시보기</h2>
            </div>
            <Link href="/replays">
              <span className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium flex items-center gap-1 cursor-pointer">
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
                        <PlayCircle className="h-8 w-8 text-[#d1d5db]" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-[#6366F1]/90 rounded-full flex items-center justify-center shadow-lg">
                        <PlayCircle className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#111318] text-sm leading-snug line-clamp-2 mb-2">{replay.title}</h3>
                    {((replay as any).tags as string[] | null)?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {((replay as any).tags as string[]).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] bg-[#f7f8fa] text-[#8b8f98] px-2 py-0.5 rounded-full border border-white/5">{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div></section>
      )}

      {/* ── Charity Live Feature ─────────────────────── */}
      <section className="section-band section-band-alt"><div className="section-band-inner">
      <div className="glass-card-gold overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-[45%] aspect-video sm:aspect-auto bg-black/30 overflow-hidden relative group cursor-pointer"
            onClick={() => window.open("https://www.youtube.com/watch?v=e3eJjWSqhuk", "_blank")}
          >
            <img
              src="https://img.youtube.com/vi/e3eJjWSqhuk/hqdefault.jpg"
              alt="기부 강의"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 bg-[#6366F1]/90 rounded-full flex items-center justify-center shadow-lg">
                <PlayCircle className="h-8 w-8 text-black" />
              </div>
            </div>
          </div>
          <div className="sm:w-[55%] p-6 sm:p-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-rose-500/15 rounded-full px-3 py-1 text-xs font-bold text-rose-600 border border-rose-500/20 mb-4 w-fit">
              <Heart className="h-3.5 w-3.5 fill-rose-400" />
              기부 특별 강의
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#111318] mb-2">
              보육원에 1,400만원 기부 강의
            </h3>
            <p className="text-sm text-[#8b8f98] mb-4 leading-relaxed">
              <span className="text-[#6366F1] font-semibold">나민수, 노션다움, 조쉬, 윤자동</span> — 4명의 강사가 모여 진행한 특별 기부 라이브. 수익금 전액이 보육원에 기부되었습니다.
            </p>
            <a
              href="https://www.youtube.com/watch?v=e3eJjWSqhuk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6366F1] hover:text-[#818CF8] transition-colors w-fit"
            >
              영상 보러가기 <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
      </div></section>

      {/* ── Category Sections ─────────────────────────── */}
      {!isLoading && CATEGORY_SECTIONS.map((section, idx) => {
        const items = getByTag(section.tag);
        if (items.length === 0) return null;
        return (
          <section key={section.tag} className={`section-band${idx % 2 === 0 ? "" : " section-band-alt"}`}><div className="section-band-inner">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-[#f7f8fa] border border-[#e5e7eb]`}>
                  <section.icon className={`h-4 w-4 ${section.color}`} />
                </div>
                <h2 className="text-lg font-bold text-[#111318]">{section.label}</h2>
              </div>
              <Link href="/replays">
                <span className="text-sm text-[#6366F1] hover:text-[#818CF8] font-medium flex items-center gap-1 cursor-pointer">
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
                          <PlayCircle className="h-8 w-8 text-[#d1d5db]" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#111318] text-sm leading-snug line-clamp-2">{replay.title}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div></section>
        );
      })}

      {/* ── Loading ─────────────────────────────────────── */}
      {isLoading && (
        <section className="section-band"><div className="section-band-inner">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${gc} overflow-hidden`}>
                <Skeleton className="aspect-video w-full bg-[#f7f8fa]" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-[#f7f8fa]" />
                  <Skeleton className="h-3 w-1/2 bg-[#f7f8fa]" />
                </div>
              </div>
            ))}
          </div>
        </div></section>
      )}

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </>
  );
}
