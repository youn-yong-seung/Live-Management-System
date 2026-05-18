import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Heart,
  Eye,
  Flame,
  Clock,
  PenSquare,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

/* ── 게시판 등록 ──────────────────────────────────────
 * 새 게시판 추가는 여기 한 줄 더 박으면 됨.
 * API 응답이 다르면 mapper로 각자 정규화.
 */
interface Board {
  slug: string;
  label: string;
  emoji: string;
  badgeCls: string;
  listPath: string;
  newPath: string;
  detailPath: (id: number) => string;
  api: string;
  enabled: boolean;
  /** API 응답을 FeedItem 배열로 정규화 */
  mapper: (raw: any) => FeedItem[];
}

const BOARDS: Board[] = [
  {
    slug: "consultations",
    label: "고민상담",
    emoji: "💡",
    badgeCls: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/30",
    listPath: "/community/consultations",
    newPath: "/community/consultations/new",
    detailPath: (id) => `/community/consultations/${id}`,
    api: "/api/community/consultations",
    enabled: true,
    mapper: (raw) =>
      (raw?.consultations ?? []).map((c: any) => ({
        boardSlug: "consultations",
        id: c.id,
        title: firstLine(c.concern) || "사연",
        preview: firstLine(c.currentWork) || firstLine(c.hardest) || "",
        authorName: c.isSeed ? "윤자동" : c.name,
        createdAt: c.createdAt,
        likeCount: c.likeCount ?? 0,
        viewCount: c.viewCount ?? 0,
        commentCount: 0,
        isSeed: c.isSeed,
      })),
  },
  // 자유게시판은 곧 합칠 예정 — 일단 placeholder만
];

const COMING_SOON_BOARDS = [
  { emoji: "📷", label: "자랑하기" },
  { emoji: "❓", label: "질문" },
  { emoji: "💼", label: "구인구직" },
];

interface FeedItem {
  boardSlug: string;
  id: number;
  title: string;
  preview: string;
  authorName: string;
  createdAt: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  isSeed?: boolean;
}

function firstLine(s: string | null | undefined): string {
  if (!s) return "";
  const i = s.search(/\n|\.|\?|!/);
  if (i === -1) return s.slice(0, 100);
  return s.slice(0, i + 1);
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export function CommunityFeed() {
  const [order, setOrder] = useState<"popular" | "recent">("popular");
  const [activeBoard, setActiveBoard] = useState<string>("all");
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    setItems(null);
    const targets = BOARDS.filter(
      (b) => b.enabled && (activeBoard === "all" || activeBoard === b.slug),
    );
    Promise.all(
      targets.map((b) =>
        fetch(`${b.api}?order=${order}&limit=8`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d ? b.mapper(d) : []))
          .catch(() => []),
      ),
    ).then((arrays) => {
      const merged = arrays.flat();
      merged.sort((a, b) => {
        if (order === "popular") return b.likeCount - a.likeCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setItems(merged.slice(0, 7));
    });
  }, [order, activeBoard]);

  return (
    <section className="section-band">
      <div className="section-band-inner" style={{ paddingTop: 24, paddingBottom: 32 }}>
        {/* 헤더 */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-2.5 py-0.5 text-[11px] font-bold mb-2">
              <Flame className="h-3 w-3" /> 지금 사람들이 보는 글
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#111318] leading-tight">
              윤자동 커뮤니티
            </h2>
            <p className="text-sm text-[#8b8f98] mt-1">
              비슷한 막힘으로 헤맨 사람들이 모여서 같이 푸는 곳이에요.
            </p>
          </div>
          <Link href="/community/consultations/new">
            <span className="inline-flex items-center gap-1.5 bg-[#6366F1] text-black font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#818CF8] cursor-pointer transition-colors gold-glow">
              <PenSquare className="h-3.5 w-3.5" /> 내 사연 쓰기
            </span>
          </Link>
        </div>

        {/* 게시판 필터 (가로 스크롤) */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <FilterChip active={activeBoard === "all"} onClick={() => setActiveBoard("all")}>
            전체
          </FilterChip>
          {BOARDS.filter((b) => b.enabled).map((b) => (
            <FilterChip
              key={b.slug}
              active={activeBoard === b.slug}
              onClick={() => setActiveBoard(b.slug)}
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </FilterChip>
          ))}
          {COMING_SOON_BOARDS.map((b, i) => (
            <span
              key={i}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-[#e5e7eb] text-[#a0a4ab] whitespace-nowrap"
              title="곧 열려요"
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
              <span className="text-[10px] font-bold text-[#a0a4ab]">soon</span>
            </span>
          ))}
        </div>

        {/* 정렬 + 전체보기 */}
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-white p-0.5 text-xs font-semibold">
            <button
              onClick={() => setOrder("popular")}
              className={`px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1 ${
                order === "popular"
                  ? "bg-[#111318] text-white"
                  : "text-[#8b8f98] hover:text-[#111318]"
              }`}
              data-testid="feed-order-popular"
            >
              <Flame className="h-3 w-3" /> 인기
            </button>
            <button
              onClick={() => setOrder("recent")}
              className={`px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1 ${
                order === "recent"
                  ? "bg-[#111318] text-white"
                  : "text-[#8b8f98] hover:text-[#111318]"
              }`}
              data-testid="feed-order-recent"
            >
              <Clock className="h-3 w-3" /> 최신
            </button>
          </div>
          <Link href="/community/consultations">
            <span className="inline-flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#818CF8] font-bold cursor-pointer">
              전체 보기 <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>

        {/* 리스트 */}
        {items === null && (
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3.5 animate-pulse"
              >
                <div className="h-4 w-3/4 bg-[#f7f8fa] rounded mb-2" />
                <div className="h-3 w-1/3 bg-[#f7f8fa] rounded" />
              </div>
            ))}
          </div>
        )}

        {items !== null && items.length === 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 text-center text-sm text-[#8b8f98]">
            아직 글이 없어요. 첫 주인공이 되어보세요.
          </div>
        )}

        {items !== null && items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item, idx) => {
              const board = BOARDS.find((b) => b.slug === item.boardSlug);
              if (!board) return null;
              const isHot = idx < 3 && order === "popular";
              return (
                <Link key={`${item.boardSlug}-${item.id}`} href={board.detailPath(item.id)}>
                  <div
                    className="bg-white border border-[#e5e7eb] hover:border-[#6366F1]/40 hover:bg-[#f7f8fa] rounded-xl px-3 sm:px-4 py-3.5 cursor-pointer transition-colors group"
                    data-testid={`feed-item-${item.boardSlug}-${item.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 좌측 좋아요 (Reddit 스타일) */}
                      <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[44px] py-0.5">
                        <Heart
                          className={`h-4 w-4 mb-0.5 ${
                            isHot
                              ? "fill-rose-500 text-rose-500"
                              : "text-[#a0a4ab]"
                          }`}
                        />
                        <span
                          className={`text-sm font-extrabold leading-none ${
                            isHot ? "text-rose-500" : "text-[#484d57]"
                          }`}
                        >
                          {item.likeCount}
                        </span>
                      </div>

                      {/* 중앙 본문 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${board.badgeCls}`}
                          >
                            <span>{board.emoji}</span>
                            <span>{board.label}</span>
                          </span>
                          {idx === 0 && order === "popular" && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white">
                              <Flame className="h-2.5 w-2.5" /> BEST
                            </span>
                          )}
                          {item.isSeed && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                              운영자
                            </span>
                          )}
                          <span className="text-[11px] text-[#484d57] font-medium">
                            {item.authorName}
                          </span>
                          <span className="text-[11px] text-[#d1d5db]">·</span>
                          <span className="text-[11px] text-[#a0a4ab]">
                            {formatRelative(item.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-[15px] font-bold text-[#111318] group-hover:text-[#6366F1] line-clamp-1 leading-snug transition-colors">
                          {item.title}
                        </h3>
                        {item.preview && (
                          <p className="text-[13px] text-[#8b8f98] line-clamp-1 mt-0.5">
                            {item.preview}
                          </p>
                        )}
                      </div>

                      {/* 우측 메타 */}
                      <div className="flex-shrink-0 hidden sm:flex items-center gap-3 text-[11px] text-[#a0a4ab] self-center">
                        <span className="inline-flex items-center gap-0.5">
                          <Eye className="h-3 w-3" /> {item.viewCount}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3" /> {item.commentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 하단 CTA */}
        <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-[#eef2ff] to-[#fdf2f8] rounded-xl px-4 py-3 border border-[#e5e7eb]">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">💬</span>
            <span className="text-[#484d57] font-semibold">
              내 막힘도 한 번 풀어볼래요?
            </span>
          </div>
          <Link href="/community/consultations/new">
            <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#6366F1] hover:text-[#818CF8] font-bold cursor-pointer">
              사연 쓰기 <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
        active
          ? "bg-[#111318] text-white border-[#111318]"
          : "bg-white text-[#484d57] border-[#e5e7eb] hover:border-[#6366F1]/40 hover:text-[#111318]"
      }`}
    >
      {children}
    </button>
  );
}
