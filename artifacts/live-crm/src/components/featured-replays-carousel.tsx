import { useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle, Star, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { ReplayModal } from "@/components/replay-modal";
import { formatRelativeTime } from "@/lib/date-utils";
import { usePIIVisible, maskName } from "@/lib/pii";

interface Review {
  id: number;
  liveId: number;
  name: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface FeaturedReplay {
  id: number;
  title: string;
  description: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  scheduledAt: string | null;
  tags: string[] | null;
  reviewCount: number;
  avgRating: number;
  reviews: Review[];
}

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function youtubeThumbnail(url: string | null) {
  if (!url) return null;
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
}

function getInitials(name: string) {
  return name.trim().slice(0, 1) || "?";
}

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-200 border-blue-400/30",
  "bg-purple-500/20 text-purple-200 border-purple-400/30",
  "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  "bg-amber-500/20 text-amber-200 border-amber-400/30",
  "bg-rose-500/20 text-rose-200 border-rose-400/30",
  "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
  "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
  "bg-pink-500/20 text-pink-200 border-pink-400/30",
];

function avatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const ROTATE_MS = 30000; // 30초 — 후기 읽을 시간 + 스크롤 진행감 충분히
const REPLAY_API = "/api/featured-replays?limit=5&reviewsPerLive=30";

export function FeaturedReplaysCarousel() {
  const [replays, setReplays] = useState<FeaturedReplay[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [modalReplay, setModalReplay] = useState<FeaturedReplay | null>(null);
  const showPII = usePIIVisible();

  useEffect(() => {
    fetch(REPLAY_API)
      .then((r) => (r.ok ? r.json() : { replays: [] }))
      .then((d) => setReplays(d.replays ?? []))
      .catch(() => setReplays([]));
  }, []);

  useEffect(() => {
    if (!replays || replays.length <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % replays.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [replays, paused]);

  // Loading / empty fallback — keep the original declare-v2 vibes
  if (replays === null) {
    return <FallbackBanner loading />;
  }
  if (replays.length === 0) {
    return <FallbackBanner />;
  }

  const current = replays[idx];
  const thumb = youtubeThumbnail(current.youtubeUrl) || current.thumbnailUrl;
  // 후기가 너무 적으면 복제해서 끊김 없는 스크롤
  const reviewsForScroll = current.reviews.length >= 3
    ? current.reviews
    : [...current.reviews, ...current.reviews, ...current.reviews];

  return (
    <>
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(0,229,229,0.12) 0%, transparent 55%), #050A0A",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Decorative grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-24">
          {/* Eyebrow */}
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#6366F1] mb-3">
              MOST LOVED REPLAYS
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              지금 가장 사랑받는<br className="sm:hidden" />{" "}
              <span style={{
                background: "linear-gradient(135deg, #FFD89B 0%, #FF7E5F 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>라이브 다시보기</span>
            </h2>
            <p className="text-sm text-white/60 mt-3">
              실제 참여자 후기 · 100% 무료로 지금 바로 시청하세요
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-12 items-stretch">
            {/* ── Left: review credits scroll ── */}
            <ReviewCreditsScroll
              trackKey={String(current.id)}
              reviews={reviewsForScroll}
              showPII={showPII}
              countBadge={current.reviewCount}
            />

            {/* ── Right: live info ── */}
            <div className="flex flex-col">
              {/* Thumbnail */}
              <div
                className="relative rounded-3xl border border-white/10 overflow-hidden aspect-video bg-black cursor-pointer group"
                onClick={() => setModalReplay(current)}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={current.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const id = current.youtubeUrl ? extractYoutubeId(current.youtubeUrl) : null;
                      if (id) (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30">
                    <PlayCircle className="h-16 w-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                    <PlayCircle className="h-9 w-9 text-[#050A0A]" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-5 sm:mt-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30">
                    <Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                    <span className="text-xs font-bold text-amber-200">{current.avgRating.toFixed(2)}</span>
                  </span>
                  <span className="text-xs text-white/50">·</span>
                  <span className="text-xs font-medium text-white/70">{current.reviewCount.toLocaleString()}개 후기</span>
                  {current.tags?.slice(0, 2).map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/70 border border-white/10">
                      {t}
                    </span>
                  ))}
                </div>

                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-2 sm:mb-3 line-clamp-2">
                  {current.title}
                </h3>

                {current.description && (
                  <p className="text-sm text-white/65 leading-relaxed line-clamp-2 sm:line-clamp-3 mb-5 sm:mb-6">
                    {current.description}
                  </p>
                )}

                <div className="mt-auto flex flex-col gap-4">
                  <button
                    onClick={() => setModalReplay(current)}
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-white text-[#050A0A] font-bold text-[14px] sm:text-[15px] hover:bg-white/90 transition-all shadow-[0_8px_32px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.25)] hover:-translate-y-0.5"
                    data-track="featured-replays:watch"
                    data-track-label={`${current.title} 다시보기 (홈 캐러셀)`}
                  >
                    <PlayCircle className="h-5 w-5" fill="currentColor" />
                    라이브 특강 100% 무료 다시보기
                  </button>

                  {/* Indicators + arrows — 모바일에선 한 줄에서 분리 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {replays.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setIdx(i)}
                          aria-label={`${i + 1}번째 라이브로 이동`}
                          className={`h-1.5 rounded-full transition-all ${
                            i === idx ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50 active:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIdx((i) => (i - 1 + replays.length) % replays.length)}
                        aria-label="이전"
                        className="w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-white/15 text-white/80 sm:text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setIdx((i) => (i + 1) % replays.length)}
                        aria-label="다음"
                        className="w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-white/15 text-white/80 sm:text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReplayModal replay={modalReplay as any} onClose={() => setModalReplay(null)} />
    </>
  );
}

/* ── Credits Scroll Container (rAF + 사용자 스크롤 허용) ─ */
function ReviewCreditsScroll({
  trackKey, reviews, showPII, countBadge,
}: {
  trackKey: string;
  reviews: Review[];
  showPII: boolean;
  countBadge: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);          // rAF 내부에서 읽으려고 ref
  const [paused, setPaused] = useState(false); // hint 표시용 state
  const [hoverCapable, setHoverCapable] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHoverCapable(window.matchMedia("(hover: hover)").matches);
  }, []);

  const pause = () => { pausedRef.current = true; setPaused(true); };
  const resume = () => { pausedRef.current = false; setPaused(false); };

  // 트랙 바뀌면 스크롤 처음으로 (재생 상태도 리셋)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    pausedRef.current = false;
    setPaused(false);
  }, [trackKey]);

  // rAF 자동 스크롤 — 마운트~언마운트 평생 단일 루프, paused는 ref로 매 프레임 체크
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const SPEED = 50; // px/sec — 카드 한 장이 약 3~4초마다 흐르는 정도
    let raf = 0;
    let last = performance.now();
    // scrollTop 누적분(소수점 포함)을 따로 보관해 sub-pixel 드롭 방지
    let accum = el.scrollTop;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); // 탭 비활성 등으로 dt 폭주 방지
      last = now;
      if (!pausedRef.current) {
        const half = el.scrollHeight / 2;
        if (half > el.clientHeight) {
          // 사용자가 휠 등으로 위치 옮겼다면 그 위치부터 다시 누적
          if (Math.abs(accum - el.scrollTop) > 2) accum = el.scrollTop;
          accum += SPEED * dt;
          if (accum >= half) accum -= half;
          el.scrollTop = accum;
        }
      } else {
        // 정지 중에는 사용자 스크롤 따라가야 다시 풀렸을 때 점프 안 함
        accum = el.scrollTop;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 탭 visible 복귀 시 last 리셋해서 점프 방지
    const onVis = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reviews.length, trackKey]);

  // 사용자가 직접 스크롤해서 절반 지나도 무한 루프 유지
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || !pausedRef.current) return;
    const half = el.scrollHeight / 2;
    if (half > el.clientHeight && el.scrollTop >= half) el.scrollTop -= half;
  };

  return (
    <div
      className="relative rounded-3xl border border-white/10 h-[440px] sm:h-[500px] lg:h-[560px] overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Fade gradients top/bottom (포인터 이벤트 통과) */}
      <div
        className="absolute inset-x-0 top-0 h-16 sm:h-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(180deg, #050A0A 0%, transparent 100%)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-16 sm:h-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(0deg, #050A0A 0%, transparent 100%)" }}
      />

      {/* 실제 스크롤 컨테이너 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseEnter={() => hoverCapable && pause()}
        onMouseLeave={() => hoverCapable && resume()}
        onTouchStart={pause}
        className="credits-scroll absolute inset-0 overflow-y-auto overscroll-contain"
        style={{ scrollbarWidth: "none" }}
        aria-label="라이브 후기 모음"
      >
        <div className="px-5 sm:px-6 py-4 space-y-4 sm:space-y-5">
          {/* 2배 복제 — 무한 루프 */}
          {[...reviews, ...reviews].map((r, i) => (
            <ReviewCreditCard key={`${r.id}-${i}`} review={r} showPII={showPII} />
          ))}
        </div>
      </div>

      {/* Count badge */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-sm pointer-events-none">
        <MessageSquare className="h-3.5 w-3.5 text-[#6366F1]" />
        <span className="text-xs font-semibold text-white">후기 {countBadge.toLocaleString()}개</span>
      </div>

      {/* 상태 인디케이터 — 항상 노출. paused에 따라 톤만 바뀜 */}
      <div
        className={`absolute top-3 sm:top-4 right-3 sm:right-4 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm pointer-events-none transition-all duration-200 ${
          paused
            ? "bg-amber-400/20 border-amber-300/40 text-amber-100"
            : "bg-black/40 border-white/15 text-white/75"
        }`}
      >
        {paused ? (
          <>
            <span className="text-[10px]">↕</span>
            <span className="text-[11px] font-semibold">마우스로 직접 스크롤</span>
          </>
        ) : (
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-wide">AUTO</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Credit Card ─────────────────────────────────────── */
function ReviewCreditCard({ review, showPII }: { review: Review; showPII: boolean }) {
  const displayName = useMemo(() => maskName(review.name, showPII), [review.name, showPII]);
  return (
    <div
      className="rounded-2xl border border-white/8 p-4 backdrop-blur-sm"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border flex-shrink-0 ${avatarColor(review.name)}`}>
          {getInitials(displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-semibold text-white truncate">{displayName}</span>
            <span className="text-[11px] text-white/45 flex-shrink-0">· {formatRelativeTime(review.createdAt)}</span>
          </div>
          <div className="flex gap-0.5 mb-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${review.rating >= s ? "fill-amber-400 text-amber-400" : "text-white/15"}`}
              />
            ))}
          </div>
          <p className="text-[13.5px] text-white/85 leading-[1.55] line-clamp-5 whitespace-pre-wrap break-words">
            {review.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Fallback (loading / no data) ───────────────────── */
function FallbackBanner({ loading = false }: { loading?: boolean }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top left, rgba(99,102,241,0.15) 0%, transparent 55%), #050A0A",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-extrabold text-white">매주 새 라이브, 다시보기는 100% 무료.</h2>
        <p className="text-sm text-white/60 mt-3">{loading ? "인기 라이브를 불러오는 중..." : "아직 등록된 다시보기가 없습니다."}</p>
      </div>
    </section>
  );
}
