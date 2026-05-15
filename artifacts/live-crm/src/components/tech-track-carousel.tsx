import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlayCircle, ChevronLeft, ChevronRight, ArrowRight,
  Compass, Sparkles, Layers, GitBranch,
} from "lucide-react";
import { Link } from "wouter";
import { ReplayModal } from "@/components/replay-modal";

/* ── Types (techtree.tsx와 호환) ─────────────────────── */

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
  children?: string[];
  tool?: string;
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

/* ── Helpers ─────────────────────────────────────────── */

function extractYoutubeId(url: string) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function ytThumb(url: string) {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

/** "Lv.3 중급" → { lv: "Lv.3", tag: "중급" } */
function parseLevel(level: string): { lv: string; tag: string } {
  const m = level.match(/^(Lv\.?\s*\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return { lv: level, tag: "" };
  return { lv: m[1].replace(/\s+/g, ""), tag: m[2].trim() };
}

/** 클로드코드 트랙 첫 번째로 + 노션/자동화/사업/엑셀/AI 순 */
const TRACK_PRIORITY: Record<string, number> = {
  claude: 0,
  notion: 1,
  automation: 2,
  "ai-biz": 3,
  business: 4,
  excel: 5,
};

function sortTracks(tracks: TreePath[]): TreePath[] {
  return [...tracks].sort((a, b) => {
    const pa = TRACK_PRIORITY[a.id] ?? 99;
    const pb = TRACK_PRIORITY[b.id] ?? 99;
    return pa - pb;
  });
}

/** 트리에서 시작 노드(루트) 찾기 — 다른 노드의 children에 속하지 않는 노드 */
function findRoot(nodes: TreeNode[]): TreeNode | null {
  if (nodes.length === 0) return null;
  const childIds = new Set<string>();
  nodes.forEach((n) => n.children?.forEach((c) => childIds.add(c)));
  return nodes.find((n) => !childIds.has(n.id)) ?? nodes[0];
}

/** BFS 순서로 정렬 — Lv 낮은 것부터, 분기는 좌→우 */
function orderNodes(nodes: TreeNode[]): TreeNode[] {
  if (nodes.length === 0) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const root = findRoot(nodes);
  if (!root) return nodes;

  const out: TreeNode[] = [];
  const queue = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    if (seen.has(cur.id)) continue;
    seen.add(cur.id);
    out.push(cur);
    (cur.children ?? []).forEach((cid) => {
      const c = byId.get(cid);
      if (c && !seen.has(cid)) queue.push(c);
    });
  }
  // 누락분(고아 노드) 뒤에
  nodes.forEach((n) => { if (!seen.has(n.id)) out.push(n); });
  return out;
}

/* ── Track Slide ─────────────────────────────────────── */

function TrackSlide({
  track,
  onWatch,
}: {
  track: TreePath;
  onWatch: (n: TreeNode) => void;
}) {
  const ordered = useMemo(() => orderNodes(track.nodes), [track.nodes]);
  const railRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector("[data-node-card]") as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 240;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <div
      className="rounded-3xl border border-white/10 overflow-hidden"
      style={{
        background:
          `linear-gradient(135deg, ${track.glowColor} 0%, rgba(255,255,255,0.03) 60%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 16px 48px ${track.glowColor}, 0 1px 0 rgba(255,255,255,0.05) inset`,
      }}
    >
      {/* Track header */}
      <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-white/10 flex flex-wrap items-start gap-4">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 border"
          style={{
            background: `${track.color}22`,
            borderColor: `${track.color}55`,
            boxShadow: `0 8px 24px ${track.glowColor}`,
          }}
        >
          {track.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-bold tracking-[0.25em] uppercase"
              style={{ color: track.color }}
            >
              CURATED TRACK
            </span>
            <span className="text-[10px] font-medium text-white/40">
              · 강의 {ordered.length}개
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            {track.name} <span className="text-white/40 text-base font-medium">트랙</span>
          </h3>
          <p className="text-sm text-white/65 mt-1.5">
            {track.description}
          </p>
        </div>
        <Link href="/techtree">
          <span
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full transition-all cursor-pointer border"
            style={{
              color: track.color,
              borderColor: `${track.color}40`,
              background: `${track.color}10`,
            }}
            data-track={`techtree:open-track:${track.id}`}
            data-track-label={`테크트리 ${track.name} 전체 보기`}
          >
            트랙 전체 보기 <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      {/* Node rail */}
      <div className="relative">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="이전 강의"
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 border border-white/15 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          aria-label="다음 강의"
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 border border-white/15 backdrop-blur-sm items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div
          ref={railRef}
          className="flex gap-4 px-6 sm:px-8 py-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {ordered.map((node, idx) => (
            <NodeCard
              key={node.id}
              node={node}
              index={idx + 1}
              color={track.color}
              onWatch={() => onWatch(node)}
              showArrow={idx < ordered.length - 1}
            />
          ))}
          {/* 끝 마커 */}
          <div className="flex items-center justify-center px-4 flex-shrink-0">
            <div className="text-center">
              <Sparkles className="h-5 w-5 text-white/30 mx-auto mb-1" />
              <p className="text-[11px] font-medium text-white/40">마스터</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="px-6 sm:px-8 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-white/55">
          한 단계씩 따라오면 <span className="text-white/85 font-semibold">자연스럽게 마스터</span>까지 도달합니다.
        </p>
        <Link href="/techtree">
          <span
            className="inline-flex md:hidden items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white"
            data-track={`techtree:open-track-mobile:${track.id}`}
          >
            트랙 전체 보기 <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <button
            onClick={() => {}}
            className="hidden md:inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full text-[#050A0A] bg-white hover:bg-white/90 transition-colors"
            data-track={`techtree:start-track:${track.id}`}
            data-track-label={`${track.name} 트랙 시작하기`}
          >
            <Compass className="h-4 w-4" />
            {track.name} 트랙 시작하기
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ── Node Card ───────────────────────────────────────── */

function NodeCard({
  node, index, color, onWatch, showArrow,
}: {
  node: TreeNode; index: number; color: string; onWatch: () => void; showArrow: boolean;
}) {
  const thumb = ytThumb(node.youtubeUrl);
  const { lv, tag } = parseLevel(node.level);
  const ytId = extractYoutubeId(node.youtubeUrl);

  return (
    <div className="flex items-center gap-2 flex-shrink-0 snap-start">
      <button
        data-node-card
        onClick={onWatch}
        className="w-[200px] sm:w-[220px] rounded-2xl border border-white/10 overflow-hidden text-left transition-all hover:-translate-y-1 hover:border-white/25 group bg-white/[0.03]"
        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
        data-track={`techtree:open-lesson:${node.id}`}
        data-track-label={`${node.title} (${lv})`}
      >
        <div className="relative aspect-video bg-black/60 overflow-hidden">
          {thumb && ytId ? (
            <img
              src={thumb}
              alt={node.shortTitle || node.title}
              className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <PlayCircle className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
          {/* Step number badge */}
          <div
            className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide backdrop-blur-md"
            style={{
              background: `${color}30`,
              borderColor: `${color}70`,
              color: "white",
            }}
          >
            <span style={{ color }} className="font-extrabold">{lv}</span>
            {tag && <span className="text-white/80">· {tag}</span>}
          </div>
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-2xl">
              <PlayCircle className="h-7 w-7 text-[#050A0A]" fill="currentColor" />
            </div>
          </div>
          {/* Step counter */}
          <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white/70 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
            STEP {index}
          </div>
        </div>
        <div className="p-3.5">
          <p className="text-[13.5px] font-bold text-white leading-snug line-clamp-2">
            {node.shortTitle || node.title}
          </p>
          {node.gains?.[0] && (
            <p className="text-[11px] text-white/55 mt-1 line-clamp-2 leading-snug">
              {node.gains.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
      </button>

      {showArrow && (
        <div className="hidden sm:flex flex-col items-center text-white/30 flex-shrink-0 px-0.5">
          <ChevronRight className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

/* ── Carousel ────────────────────────────────────────── */

const ROTATE_MS = 11000;

export function TechTrackCarousel() {
  const [tracks, setTracks] = useState<TreePath[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [modalReplay, setModalReplay] = useState<any>(null);

  useEffect(() => {
    fetch("/api/tech-tree")
      .then((r) => (r.ok ? r.json() : { paths: [] }))
      .then((d) => setTracks(sortTracks(d.paths ?? [])))
      .catch(() => setTracks([]));
  }, []);

  useEffect(() => {
    if (!tracks || tracks.length <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % tracks.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [tracks, paused]);

  const handleWatch = async (node: TreeNode) => {
    // 라이브 정보 fetch 후 modal에 전달 (replay-modal과 인터페이스 호환)
    if (!node.liveId) return;
    try {
      const r = await fetch(`/api/lives/${node.liveId}`);
      if (!r.ok) throw new Error();
      const live = await r.json();
      setModalReplay(live);
    } catch {
      // fallback — 유튜브로 새 탭
      if (node.youtubeUrl) window.open(node.youtubeUrl, "_blank", "noopener");
    }
  };

  if (tracks === null) {
    return <LoadingSection />;
  }
  if (tracks.length === 0) {
    return null; // 데이터 없으면 섹션 자체 안 보임
  }

  const current = tracks[idx];

  return (
    <>
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(0,229,229,0.10) 0%, transparent 55%), #050A0A",
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
          {/* Section narrative */}
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">
              <Layers className="h-3.5 w-3.5 text-[#6366F1]" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/80">
                Tech Tree — 큐레이션된 학습 경로
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              <span className="text-white/60">너무 많은 강의 속에</span><br />
              내 수준에 맞는 강의,{" "}
              <span style={{
                background: "linear-gradient(135deg, #FFD89B 0%, #FF7E5F 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>골라드렸어요.</span>
            </h2>

            <p className="text-sm sm:text-base text-white/65 mt-4 leading-relaxed">
              초보자도, 이미 좀 하시는 분도 — <strong className="text-white/90">본인 레벨에 맞는 강의부터 한 단계씩.</strong><br className="hidden sm:block" />
              시작점부터 마스터까지, 어떤 순서로 봐야 할지 트랙별로 큐레이션해두었습니다.
            </p>
          </div>

          {/* Track slide */}
          <div key={current.id} className="track-slide-enter">
            <TrackSlide track={current} onWatch={handleWatch} />
          </div>

          {/* Track nav: indicators (emoji chips) */}
          <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
            {tracks.map((t, i) => {
              const active = i === idx;
              return (
                <button
                  key={t.id}
                  onClick={() => setIdx(i)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    active
                      ? "text-white scale-105"
                      : "text-white/60 hover:text-white/90 border-white/10 hover:border-white/25"
                  }`}
                  style={
                    active
                      ? {
                          background: `${t.color}25`,
                          borderColor: `${t.color}80`,
                          boxShadow: `0 0 24px ${t.glowColor}`,
                        }
                      : {}
                  }
                  data-track={`techtree:nav:${t.id}`}
                  data-track-label={`${t.name} 트랙 보기`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>

          {/* All tracks CTA */}
          <div className="mt-6 text-center">
            <Link href="/techtree">
              <span
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
                data-track="techtree:see-all"
                data-track-label="전체 테크트리 보기"
              >
                <GitBranch className="h-4 w-4" />
                전체 테크트리에서 자세히 보기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <ReplayModal replay={modalReplay as any} onClose={() => setModalReplay(null)} />
    </>
  );
}

/* ── Loading ─────────────────────────────────────────── */

function LoadingSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top right, rgba(99,102,241,0.12) 0%, transparent 55%), #050A0A",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="h-7 w-72 mx-auto bg-white/5 rounded-full animate-pulse mb-4" />
        <div className="h-10 w-96 mx-auto bg-white/5 rounded animate-pulse mb-6" />
        <div className="h-72 w-full max-w-5xl mx-auto bg-white/5 rounded-3xl animate-pulse" />
      </div>
    </section>
  );
}
