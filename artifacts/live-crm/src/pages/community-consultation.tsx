import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Heart,
  Eye,
  PenSquare,
  Sparkles,
  Video,
  ArrowLeft,
  Flame,
  Clock,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ConsultationRow {
  id: number;
  authorId: string | null;
  name: string;
  ageRange: string;
  industry: string;
  industryCustom: string | null;
  jobType: string;
  jobTypeCustom: string | null;
  currentWork: string;
  concern: string;
  hardest: string;
  liveRequested: boolean;
  liveId: number | null;
  likeCount: number;
  viewCount: number;
  status: string;
  isSeed: boolean;
  createdAt: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  liked: boolean;
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

function getVisitorId(): string {
  const key = "yp_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

interface BoardHeaderConfig {
  badge: string;
  title: string;
  description: string;
}

export default function CommunityConsultation() {
  const [items, setItems] = useState<ConsultationRow[] | null>(null);
  const [order, setOrder] = useState<"popular" | "recent">("popular");
  const [busyId, setBusyId] = useState<number | null>(null);
  // null = 로드 전. 사용자 수정본이 도착하기 전에 fallback이 노출되는 깜빡임 방지.
  const [boardHeader, setBoardHeader] = useState<BoardHeaderConfig | null>(null);

  useEffect(() => {
    setItems(null);
    fetch(`/api/community/consultations?order=${order}`, {
      headers: { "x-visitor-id": getVisitorId() },
    })
      .then((r) => (r.ok ? r.json() : { consultations: [] }))
      .then((d) => setItems(d.consultations ?? []))
      .catch(() => setItems([]));
  }, [order]);

  useEffect(() => {
    fetch("/api/community/consultations/meta/form-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setBoardHeader(
          d?.config?.board ?? {
            badge: "윤자동의 자동화 상담소",
            title: "반복업무 때문에 막힌 일, 18년 경력으로 직접 처방해드려요.",
            description:
              "자동화·AI·AX 어디서 막혔는지 알려주시면, 매주 목요일 라이브에서 직접 답변드립니다.",
          },
        );
      })
      .catch(() =>
        setBoardHeader({
          badge: "윤자동의 자동화 상담소",
          title: "반복업무 때문에 막힌 일, 18년 경력으로 직접 처방해드려요.",
          description:
            "자동화·AI·AX 어디서 막혔는지 알려주시면, 매주 목요일 라이브에서 직접 답변드립니다.",
        }),
      );
  }, []);

  const handleLike = async (id: number) => {
    if (busyId === id) return;
    setBusyId(id);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch(`/api/community/consultations/${id}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ visitorId: getVisitorId() }),
    });

    if (res.ok) {
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setItems((prev) =>
        prev
          ? prev.map((c) =>
              c.id === id
                ? { ...c, liked: data.liked, likeCount: data.likeCount }
                : c,
            )
          : prev,
      );
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <Link href="/community">
        <span className="inline-flex items-center gap-1.5 text-sm text-[#8b8f98] hover:text-[#6366F1] transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> 커뮤니티
        </span>
      </Link>

      {/* 헤더 / 히어로 — 로드 전엔 스켈레톤 (fallback 깜빡임 방지) */}
      {boardHeader === null ? (
        <div className="glass-card-gold p-6 sm:p-8 space-y-3 animate-pulse">
          <div className="h-5 w-40 bg-[#eef0f3] rounded-full" />
          <div className="h-7 w-3/4 bg-[#eef0f3] rounded" />
          <div className="h-4 w-full bg-[#eef0f3] rounded" />
          <div className="h-4 w-5/6 bg-[#eef0f3] rounded" />
        </div>
      ) : (
        <div className="glass-card-gold p-6 sm:p-8 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/15 rounded-full px-3 py-1 text-xs font-bold text-[#6366F1] border border-[#6366F1]/30">
            <Sparkles className="h-3.5 w-3.5" />
            {boardHeader.badge}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111318] leading-tight whitespace-pre-line">
            {boardHeader.title}
          </h1>
          <p className="text-[#484d57] text-sm leading-relaxed whitespace-pre-line">
            {boardHeader.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/community/consultations/new">
              <span className="inline-flex items-center gap-2 bg-[#6366F1] text-black font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#818CF8] transition-all cursor-pointer gold-glow">
                <PenSquare className="h-4 w-4" /> 사연 신청하기
              </span>
            </Link>
            <Link href="/lives">
              <span className="inline-flex items-center gap-2 border border-[#e5e7eb] text-[#484d57] font-semibold text-sm px-5 py-3 rounded-xl hover:bg-[#f7f8fa] cursor-pointer transition-colors">
                <Video className="h-4 w-4" /> 이번 라이브 보기
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* 정렬 탭 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#111318]">올라온 사연</h2>
        <div className="inline-flex rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] p-1 text-xs font-medium">
          <button
            onClick={() => setOrder("popular")}
            className={`px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
              order === "popular" ? "bg-white text-[#111318] shadow-sm" : "text-[#8b8f98]"
            }`}
            data-testid="tab-popular"
          >
            <Flame className="h-3 w-3" /> 인기순
          </button>
          <button
            onClick={() => setOrder("recent")}
            className={`px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
              order === "recent" ? "bg-white text-[#111318] shadow-sm" : "text-[#8b8f98]"
            }`}
            data-testid="tab-recent"
          >
            <Clock className="h-3 w-3" /> 최신순
          </button>
        </div>
      </div>

      {/* 목록 */}
      {items === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 w-2/3 bg-[#f7f8fa] rounded mb-2" />
              <div className="h-3 w-1/3 bg-[#f7f8fa] rounded" />
            </div>
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Lightbulb className="h-10 w-10 text-[#d1d5db] mx-auto mb-4" />
          <p className="text-[#8b8f98] text-sm mb-1">아직 올라온 사연이 없어요.</p>
          <p className="text-[#a0a4ab] text-xs mb-5">첫 번째 사연 주인공이 되어보세요.</p>
          <Link href="/community/consultations/new">
            <span className="inline-flex items-center gap-2 bg-[#6366F1] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#818CF8] cursor-pointer transition-colors gold-glow">
              <PenSquare className="h-4 w-4" /> 사연 신청하기
            </span>
          </Link>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div className="space-y-3">
          {items.map((c) => {
            const industryLabel =
              c.industry === "기타" && c.industryCustom ? c.industryCustom : c.industry;
            const jobLabel =
              c.jobType === "기타" && c.jobTypeCustom ? c.jobTypeCustom : c.jobType;
            return (
              <div
                key={c.id}
                className="glass-card p-5 hover:bg-[#eef0f3] transition-colors group"
                data-testid={`consultation-${c.id}`}
              >
                <Link href={`/community/consultations/${c.id}`}>
                  <div className="cursor-pointer">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge>{c.ageRange}</Badge>
                      <Badge>{industryLabel}</Badge>
                      <Badge>{jobLabel}</Badge>
                      {c.liveRequested && (
                        <Badge tone="indigo">
                          <Video className="h-3 w-3" /> 라이브 참가
                        </Badge>
                      )}
                      {c.status === "answered" && (
                        <Badge tone="green">답변 완료</Badge>
                      )}
                      {c.status === "featured" && (
                        <Badge tone="amber">라이브 픽업</Badge>
                      )}
                    </div>

                    <h3 className="font-bold text-[#111318] text-base leading-snug mb-2 line-clamp-2 group-hover:text-[#6366F1] transition-colors">
                      {c.concern}
                    </h3>
                    <p className="text-sm text-[#484d57] line-clamp-2 mb-3">
                      <span className="text-[#8b8f98]">가장 힘든 점 — </span>
                      {c.hardest}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center justify-between text-xs text-[#8b8f98]">
                  <div className="flex items-center gap-3">
                    <span>
                      {c.isSeed ? "윤자동" : c.name}
                    </span>
                    <span>{formatRelative(c.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {c.viewCount}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleLike(c.id);
                    }}
                    disabled={busyId === c.id}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
                      c.liked
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        : "border-[#e5e7eb] text-[#8b8f98] hover:bg-[#f7f8fa]"
                    }`}
                    data-testid={`btn-like-${c.id}`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${c.liked ? "fill-rose-500" : ""}`}
                    />
                    <span className="font-semibold">{c.likeCount}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "indigo" | "green" | "amber";
}) {
  const cls = {
    default: "bg-[#f7f8fa] text-[#484d57] border-[#e5e7eb]",
    indigo: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/30",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${cls}`}
    >
      {children}
    </span>
  );
}
