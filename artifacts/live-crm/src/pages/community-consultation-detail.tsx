import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Heart,
  Eye,
  Video,
  Sparkles,
  Loader2,
  UserCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Consultation {
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

function getVisitorId(): string {
  const key = "yp_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export default function CommunityConsultationDetail() {
  const [, params] = useRoute("/community/consultations/:id");
  const id = parseInt(params?.id ?? "0", 10);
  const [c, setC] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/community/consultations/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setC(d?.consultation ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!c || liking) return;
    setLiking(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(`/api/community/consultations/${c.id}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ visitorId: getVisitorId() }),
    });
    if (res.ok) {
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setC({ ...c, liked: data.liked, likeCount: data.likeCount });
    }
    setLiking(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-[#8b8f98] animate-spin" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <p className="text-[#8b8f98] text-sm text-center">
          사연을 찾을 수 없어요.
        </p>
        <div className="text-center mt-4">
          <Link href="/community/consultations">
            <span className="inline-flex items-center gap-1.5 text-sm text-[#6366F1] cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /> 목록으로
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const industryLabel =
    c.industry === "기타" && c.industryCustom ? c.industryCustom : c.industry;
  const jobLabel = c.jobType === "기타" && c.jobTypeCustom ? c.jobTypeCustom : c.jobType;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link href="/community/consultations">
        <span className="inline-flex items-center gap-1.5 text-sm text-[#8b8f98] hover:text-[#6366F1] cursor-pointer transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> 고민상담소
        </span>
      </Link>

      <div className="glass-card p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{c.ageRange}</Badge>
          <Badge>{industryLabel}</Badge>
          <Badge>{jobLabel}</Badge>
          {c.liveRequested && (
            <Badge tone="indigo">
              <Video className="h-3 w-3" /> 라이브 참가
            </Badge>
          )}
          {c.status === "answered" && <Badge tone="green">답변 완료</Badge>}
          {c.status === "featured" && <Badge tone="amber">라이브 픽업</Badge>}
        </div>

        <div className="flex items-center gap-2 text-sm text-[#484d57]">
          {c.isSeed ? (
            <>
              <Sparkles className="h-4 w-4 text-[#6366F1]" />
              <span className="font-semibold text-[#6366F1]">윤자동</span>
            </>
          ) : (
            <>
              <UserCircle className="h-4 w-4 text-[#8b8f98]" />
              <span>{c.name}</span>
            </>
          )}
          <span className="text-[#a0a4ab]">·</span>
          <span className="text-[#8b8f98]">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
          <span className="text-[#a0a4ab]">·</span>
          <span className="inline-flex items-center gap-1 text-[#8b8f98]">
            <Eye className="h-3.5 w-3.5" /> {c.viewCount}
          </span>
        </div>

        <Section title="어떤 일을 하시나요?">{c.currentWork}</Section>
        <Section title="어떤 고민이 있으신가요?">{c.concern}</Section>
        <Section title="가장 힘든 게 무엇인가요?">{c.hardest}</Section>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              c.liked
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                : "border-[#e5e7eb] text-[#484d57] hover:bg-[#f7f8fa]"
            } disabled:opacity-60`}
            data-testid="btn-like-detail"
          >
            <Heart className={`h-4 w-4 ${c.liked ? "fill-rose-500" : ""}`} />
            좋아요 {c.likeCount}
          </button>
        </div>
      </div>

      <div className="glass-card p-6 text-center">
        <p className="text-sm text-[#484d57] leading-relaxed mb-4">
          비슷한 고민이 있으신가요?
          <br />
          사연 한 번이면 라이브 참가까지 같이 신청됩니다.
        </p>
        <Link href="/community/consultations/new">
          <span className="inline-flex items-center gap-2 bg-[#6366F1] text-black font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#818CF8] cursor-pointer transition-colors gold-glow">
            내 사연도 신청하기
          </span>
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-[#6366F1] uppercase tracking-wide">{title}</div>
      <p className="whitespace-pre-line text-[#111318] text-[15px] leading-[1.85] font-normal">
        {children}
      </p>
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
