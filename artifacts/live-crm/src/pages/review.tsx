import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import { Star, ChevronLeft, MessageSquare, Loader2 } from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

interface LiveInfo {
  id: number;
  title: string;
  scheduledAt: string | null;
  status: "live" | "scheduled" | "ended";
}

interface Review {
  id: number;
  liveId: number;
  name: string;
  rating: number;
  content: string;
  createdAt: string;
}

/* ── Helpers ─────────────────────────────────────────── */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function getInitials(name: string) {
  return name.trim().slice(0, 2) || "?";
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-green-100 text-green-600",
  "bg-yellow-100 text-yellow-700",
  "bg-pink-100 text-pink-600",
  "bg-indigo-100 text-indigo-600",
];

function avatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

/* ── Star Rating Component ──────────────────────────── */

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={`transition-transform ${readOnly ? "cursor-default" : "hover:scale-110"}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${(hovered || value) >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Review Card Component ──────────────────────────── */

function ReviewCard({ review }: { review: Review }) {
  const color = avatarColor(review.name);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
          {getInitials(review.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{review.name}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(review.createdAt)}</span>
          </div>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${review.rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{review.content}</p>
    </div>
  );
}

/* ── Main Review Page ───────────────────────────────── */

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const liveId = parseInt(params.id ?? "", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [live, setLive] = useState<LiveInfo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({ name: "", rating: 0, content: "" });
  const [errors, setErrors] = useState<{ name?: string; rating?: string; content?: string }>({});

  useEffect(() => {
    if (isNaN(liveId)) { setIsLoadingLive(false); return; }
    setIsLoadingLive(true);
    apiFetch<LiveInfo>(`/lives/${liveId}`)
      .then((l) => setLive(l))
      .catch(() => setLive(null))
      .finally(() => setIsLoadingLive(false));
  }, [liveId]);

  const loadReviews = () => {
    if (isNaN(liveId)) { setIsLoadingReviews(false); return; }
    setIsLoadingReviews(true);
    apiFetch<Review[]>(`/lives/${liveId}/reviews`)
      .then((r) => setReviews(r))
      .catch(() => setReviews([]))
      .finally(() => setIsLoadingReviews(false));
  };

  useEffect(() => { loadReviews(); }, [liveId]);

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "이름을 입력해주세요.";
    if (form.rating === 0) errs.rating = "별점을 선택해주세요.";
    if (!form.content.trim()) errs.content = "후기 내용을 입력해주세요.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const review = await apiFetch<Review>(`/lives/${liveId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ name: form.name, rating: form.rating, content: form.content }),
      });
      setReviews((prev) => [review, ...prev]);
      setForm({ name: "", rating: 0, content: "" });
      setErrors({});
      toast({ title: "후기 제출 완료", description: "소중한 후기 감사합니다!" });
    } catch (err) {
      toast({ variant: "destructive", title: "제출 실패", description: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLive) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <p className="text-gray-500 font-medium">라이브를 찾을 수 없습니다.</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/replays")}>
          다시보기로 돌아가기
        </Button>
      </div>
    );
  }

  const isEnded = live.status === "ended";

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Back navigation */}
      <button
        onClick={() => navigate("/replays")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        다시보기로 돌아가기
      </button>

      {/* ── Live info header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                live.status === "live" ? "bg-red-50 text-red-600" :
                live.status === "scheduled" ? "bg-blue-50 text-blue-600" :
                "bg-gray-100 text-gray-500"
              }`}>
                {live.status === "live" ? "진행중" : live.status === "scheduled" ? "예정됨" : "종료됨"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{live.title}</h1>
            {live.scheduledAt && (
              <p className="text-sm text-gray-400 mt-1">{formatDate(live.scheduledAt)}</p>
            )}
          </div>
          {avgRating && (
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
              <div className="flex gap-0.5 justify-end mt-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-3.5 w-3.5 ${parseFloat(avgRating) >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{reviews.length}개 후기</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">

        {/* ── Left: review list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              후기 목록
              {reviews.length > 0 && <span className="text-xs font-normal text-gray-400">({reviews.length}개)</span>}
            </h2>
          </div>

          {isLoadingReviews ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 py-16 text-center">
              <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">아직 후기가 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">첫 번째 후기를 남겨보세요!</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-1 space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: write form */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">후기 작성</h2>

            {!isEnded ? (
              <div className="bg-gray-50 rounded-xl px-4 py-6 text-center">
                <p className="text-sm text-gray-500 font-medium">
                  {live.status === "live" ? "진행 중인 라이브입니다." : "아직 시작하지 않은 라이브입니다."}
                </p>
                <p className="text-xs text-gray-400 mt-1">라이브가 종료된 후 후기를 남길 수 있습니다.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">이름</label>
                  <Input
                    placeholder="홍길동"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-xl border-gray-200"
                    disabled={isSubmitting}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">별점</label>
                  <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
                  {errors.rating && <p className="text-xs text-red-500">{errors.rating}</p>}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">후기 내용</label>
                  <Textarea
                    placeholder="라이브 강의가 어떠셨나요? 솔직한 후기를 남겨주세요."
                    rows={5}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    className="resize-none rounded-xl border-gray-200 text-sm"
                    disabled={isSubmitting}
                  />
                  {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  후기 제출
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
