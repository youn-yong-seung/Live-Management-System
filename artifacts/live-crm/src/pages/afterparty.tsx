import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  PlayCircle,
  Download,
  ExternalLink,
  Sparkles,
  Calendar,
  ArrowRight,
  Loader2,
  Gift,
  MessageCircle,
  Check,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { formatDate } from "@/lib/date-utils";

interface AfterpartyMaterial {
  title: string;
  url: string;
}

interface AfterpartyData {
  live: {
    id: number;
    title: string;
    description: string | null;
    scheduledAt: string | null;
    youtubeUrl: string | null;
    thumbnailUrl: string | null;
  };
  materials: AfterpartyMaterial[];
  products: AfterpartyMaterial[];
  kakao: {
    url: string;
    headline: string;
    body: string;
    buttonLabel: string;
  };
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const VISITOR_KEY = "afterparty_visitor_id";

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now().toString(36)}`;
  }
}

function track(liveId: number, eventType: string, meta?: Record<string, unknown>) {
  if (!liveId) return;
  const visitorId = getVisitorId();
  const payload = JSON.stringify({ eventType, visitorId, meta });
  const url = `${BASE}/api/lives/${liveId}/track`;
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}

export default function Afterparty() {
  const [, params] = useRoute("/lives/:id/after");
  const liveId = parseInt(params?.id ?? "0", 10);
  const [data, setData] = useState<AfterpartyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayPlaying, setReplayPlaying] = useState(false);

  useEffect(() => {
    if (!liveId) {
      setError("잘못된 접근입니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${BASE}/api/lives/${liveId}/after`)
      .then((r) => {
        if (!r.ok) throw new Error("페이지를 불러오지 못했습니다.");
        return r.json();
      })
      .then((d: AfterpartyData) => {
        setData(d);
        track(liveId, "page_view");
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [liveId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <p className="text-[#484d57] text-lg font-medium mb-2">{error ?? "라이브를 찾을 수 없습니다."}</p>
        <p className="text-[#8b8f98] text-sm">URL을 다시 확인해주세요.</p>
      </div>
    );
  }

  const youtubeId = data.live.youtubeUrl ? extractYoutubeId(data.live.youtubeUrl) : null;
  const hasMaterials = data.materials.length > 0;
  const hasProducts = (data.products ?? []).length > 0;
  const hasKakao = data.kakao.url.trim() !== "";

  return (
    <div className="min-h-screen bg-white text-[#111318]">
      {/* ── Decorative ambient blobs ──────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-[#005051]/20 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-[#6366F1]/10 blur-[120px]" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10 sm:space-y-14">
        {/* ── Hero ──────────────────────────────────── */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            오늘의 라이브 보너스
          </div>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight">
            오늘 함께해주셔서<br className="sm:hidden" />
            <span className="text-[#6366F1]"> 정말 고맙습니다 🙏</span>
          </h1>
          <p className="text-[#484d57] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            아래에서 <span className="text-[#111318] font-semibold">오늘 라이브 다시보기</span>와{" "}
            <span className="text-[#111318] font-semibold">무료 자료</span>를 받아가시고,<br className="hidden sm:block" />
            매주 무료 특강이 열리는 카톡방에도 꼭 입장해보세요.
          </p>
        </header>

        {/* ── Live info card ────────────────────────── */}
        <div className="glass-card p-5 sm:p-7">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="h-4.5 w-4.5 text-[#6366F1]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8b8f98] font-medium mb-1 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {data.live.scheduledAt ? formatDate(data.live.scheduledAt) : "오늘의 라이브"}
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-[#111318] leading-tight">{data.live.title}</h2>
            </div>
          </div>
          {data.live.description && (
            <p className="text-sm text-[#8b8f98] leading-relaxed mt-3 whitespace-pre-line">
              {data.live.description}
            </p>
          )}
        </div>

        {/* ── Replay video ──────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <PlayCircle className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-bold text-[#111318] uppercase tracking-wider">다시보기</h3>
          </div>
          <div className="glass-card overflow-hidden p-0">
            <div className="aspect-video w-full bg-black relative">
              {youtubeId ? (
                replayPlaying ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                    title={data.live.title}
                    className="w-full h-full"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      track(liveId, "replay_click");
                      setReplayPlaying(true);
                    }}
                    className="group absolute inset-0 w-full h-full focus:outline-none"
                    aria-label="다시보기 재생"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                      alt={data.live.title}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.fallback) {
                          img.dataset.fallback = "1";
                          img.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                        }
                      }}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
                      <div className="w-20 h-20 rounded-full bg-[#6366F1] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform gold-glow">
                        <PlayCircle className="h-10 w-10 text-black fill-black" />
                      </div>
                      <p className="mt-3 text-[#111318] font-bold text-sm sm:text-base drop-shadow-lg">▶ 다시보기 재생</p>
                    </div>
                  </button>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#a0a4ab] gap-2">
                  <PlayCircle className="h-12 w-12" />
                  <p className="text-sm">아직 다시보기 영상이 등록되지 않았습니다</p>
                </div>
              )}
            </div>
          </div>
          {data.live.youtubeUrl && youtubeId && (
            <a
              href={data.live.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#8b8f98] hover:text-[#6366F1] transition-colors px-1"
            >
              <ExternalLink className="h-3 w-3" />
              YouTube에서 보기
            </a>
          )}
        </section>

        {/* ── Materials ─────────────────────────────── */}
        {hasMaterials && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Gift className="h-4 w-4 text-[#6366F1]" />
              <h3 className="text-sm font-bold text-[#111318] uppercase tracking-wider">오늘의 무료 자료</h3>
              <span className="text-xs text-[#a0a4ab] font-medium">({data.materials.length}개)</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.materials.map((m, i) => (
                <a
                  key={`${m.url}-${i}`}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track(liveId, "material_click", { title: m.title, url: m.url, index: i })}
                  className="glass-card p-4 sm:p-5 flex items-center gap-3 group hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0 group-hover:bg-[#6366F1]/25 transition-colors">
                    <FileText className="h-4.5 w-4.5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111318] truncate">{m.title}</p>
                    <p className="text-xs text-[#8b8f98] mt-0.5 flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      받기
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Related Products ──────────────────────── */}
        {hasProducts && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <ShoppingBag className="h-4 w-4 text-[#6366F1]" />
              <h3 className="text-sm font-bold text-[#111318] uppercase tracking-wider">관련 상품</h3>
              <span className="text-xs text-[#a0a4ab] font-medium">({data.products.length}개)</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.products.map((p, i) => (
                <a
                  key={`${p.url}-${i}`}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track(liveId, "product_click", { title: p.title, url: p.url, index: i })}
                  className="glass-card p-4 sm:p-5 flex items-center gap-3 group hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f7f8fa] border border-[#e5e7eb] flex items-center justify-center flex-shrink-0 group-hover:bg-[#6366F1]/15 group-hover:border-[#6366F1]/30 transition-colors">
                    <ShoppingBag className="h-4.5 w-4.5 text-[#484d57] group-hover:text-[#6366F1] transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111318] truncate">{p.title}</p>
                    <p className="text-xs text-[#8b8f98] mt-0.5 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      자세히 보기
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Kakao CTA ─────────────────────────────── */}
        {hasKakao && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <MessageCircle className="h-4 w-4 text-[#6366F1]" />
              <h3 className="text-sm font-bold text-[#111318] uppercase tracking-wider">매주 무료 특강 카톡방</h3>
            </div>

            <div className="glass-card-gold p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black leading-tight text-[#111318]">
                  {data.kakao.headline}
                </h2>
                <p className="text-sm sm:text-base text-[#484d57] leading-relaxed whitespace-pre-line">
                  {data.kakao.body}
                </p>
              </div>

              <ul className="space-y-2 pt-1">
                {[
                  "매주 분야별 AI 실무자가 진행하는 무료 라이브 특강",
                  "톡방에 들어오기만 해도 매주 무료 자료 발송",
                  "지나간 모든 라이브 다시보기 무료 제공",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#111318]">
                    <Check className="h-4 w-4 text-[#6366F1] mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href={data.kakao.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track(liveId, "kakao_click", { url: data.kakao.url })}
                className="gold-glow flex items-center justify-center gap-2 w-full bg-[#6366F1] hover:bg-[#818CF8] text-black font-black text-base sm:text-lg py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              >
                <MessageCircle className="h-5 w-5" />
                {data.kakao.buttonLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>
        )}

        {/* ── Footer ────────────────────────────────── */}
        <footer className="pt-6 text-center">
          <p className="text-xs text-[#a0a4ab]">
            자동화가 필요하면 <span className="text-[#6366F1] font-semibold">윤자동</span> · 구독
          </p>
        </footer>
      </div>
    </div>
  );
}
