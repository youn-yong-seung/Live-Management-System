import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaySquare, MessageSquare, Star, Send, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { usePIIVisible, maskName } from "@/lib/pii";
import { formatRelativeTime } from "@/lib/date-utils";

function getInitials(name: string) {
  return name.trim().slice(0, 1) || "?";
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-600",
  "bg-indigo-100 text-indigo-600",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-600",
];

function avatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

interface Review {
  id: number;
  name: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface ReplayLive {
  id: number;
  title: string;
  description: string | null;
  youtubeUrl: string | null;
  tags?: string[] | null;
}

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 transition-colors ${
            i <= value ? "fill-amber-400 text-amber-400" : "text-gray-200"
          } ${onChange ? "cursor-pointer hover:text-amber-300" : ""}`}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );
}

export function ReplayModal({
  replay,
  onClose,
}: {
  replay: ReplayLive | null;
  onClose: () => void;
}) {
  const showPII = usePIIVisible();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 0, content: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!replay) { setIsFullscreen(false); return; }
    setIsLoadingReviews(true);
    setReviews([]);
    setReviewForm({ name: "", rating: 0, content: "" });
    setSubmitError("");
    fetch(`/api/lives/${replay.id}/reviews`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => Array.isArray(data) ? setReviews(data) : setReviews([]))
      .catch(() => setReviews([]))
      .finally(() => setIsLoadingReviews(false));
  }, [replay]);

  const handleSubmitReview = async () => {
    if (!replay) return;
    if (!reviewForm.name.trim()) { setSubmitError("이름을 입력해주세요"); return; }
    if (reviewForm.rating === 0) { setSubmitError("별점을 선택해주세요"); return; }
    if (!reviewForm.content.trim()) { setSubmitError("후기를 입력해주세요"); return; }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/lives/${replay.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "후기 등록에 실패했습니다");
      }
      const newReview = await res.json();
      setReviews((prev) => [newReview, ...prev]);
      setReviewForm({ name: "", rating: 0, content: "" });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const youtubeId = replay?.youtubeUrl ? extractYoutubeId(replay.youtubeUrl) : null;
  const tags = (replay as any)?.tags as string[] | null | undefined;

  return (
    <Dialog open={!!replay} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={
          isFullscreen
            ? "max-w-none w-screen h-screen p-0 bg-white border-0 rounded-none overflow-hidden flex flex-col lg:flex-row"
            // 모바일 — 풀스크린에 가까운 사이즈, 데스크탑 — 카드형 모달
            : "max-w-5xl w-screen h-screen sm:w-[95vw] sm:h-[90vh] p-0 bg-white border-0 sm:border sm:border-[#e5e7eb] rounded-none sm:rounded-md overflow-hidden flex flex-col lg:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        }
      >
        {replay && (
          <>
            {/* Radix 접근성 요구사항 — sr-only로 시각 숨김 */}
            <DialogTitle className="sr-only">{replay.title}</DialogTitle>
            <DialogDescription className="sr-only">{replay.description ?? "라이브 다시보기 영상"}</DialogDescription>

            {/* Fullscreen toggle — 데스크탑에서만 보임. 모바일은 이미 풀스크린 */}
            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              aria-label={isFullscreen ? "전체화면 해제" : "전체화면으로 보기"}
              className="hidden sm:flex absolute right-12 top-4 z-20 rounded-sm p-1 text-[#484d57] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40 items-center justify-center"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Left: Video — 모바일은 auto(영상+제목), 데스크탑은 flex-1 */}
            <div className="flex-shrink-0 lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
              <div className={`w-full bg-black flex-shrink-0 ${isFullscreen ? "h-[65vh] lg:h-full" : "aspect-video"}`}>
                {youtubeId ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                    title={replay.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <PlaySquare className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-bold text-[#111318] mb-1 leading-snug line-clamp-2">{replay.title}</h2>
                <p className="text-xs sm:text-sm text-[#8b8f98] line-clamp-2 hidden sm:block">{replay.description}</p>
                {tags?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-3">
                    {tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[11px] sm:text-xs bg-[#f7f8fa] text-[#8b8f98] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-white/5">{tag}</span>
                    ))}
                  </div>
                ) : null}
                {replay.youtubeUrl && (
                  <a href={replay.youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 sm:mt-3 text-xs font-semibold text-[#6366F1] hover:text-[#818CF8] transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> YouTube에서 보기
                  </a>
                )}
              </div>
            </div>

            {/* Right: Reviews — 모바일에선 남은 영역 다 차지(flex-1), 데스크탑은 고정폭 사이드바 */}
            <div className={`w-full ${isFullscreen ? "lg:w-[440px]" : "lg:w-[360px]"} flex-1 lg:flex-none border-t lg:border-t-0 lg:border-l border-[#e5e7eb] flex flex-col min-h-0`}>
              <div className="flex items-baseline gap-2 px-5 py-4 border-b border-[#e5e7eb] flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-[#6366F1] self-center" />
                <span className="font-bold text-[#0f0f0f] text-[15px]">후기</span>
                <span className="text-[13px] text-[#606060] font-medium">{reviews.length}개</span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
                {isLoadingReviews ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-24 rounded" />
                          <Skeleton className="h-12 w-full rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => {
                    const displayName = maskName(review.name, showPII);
                    return (
                      <div key={review.id} className="flex gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(review.name)}`}>
                          {getInitials(displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[13px] font-semibold text-[#0f0f0f] truncate">{displayName}</span>
                            <span className="text-[12px] text-[#606060] flex-shrink-0">· {formatRelativeTime(review.createdAt)}</span>
                          </div>
                          <div className="flex gap-0.5 mb-1.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${review.rating >= s ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                              />
                            ))}
                          </div>
                          <p className="text-[14px] text-[#0f0f0f] leading-[1.6] whitespace-pre-wrap break-words">
                            {review.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-[#606060] text-sm">
                    아직 후기가 없습니다.<br />첫 후기를 남겨보세요!
                  </div>
                )}
              </div>

              <div className="border-t border-[#e5e7eb] p-3 sm:p-4 flex-shrink-0 space-y-2.5 sm:space-y-3 bg-white/[0.03]">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Input
                    placeholder="이름"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                    className="flex-1 h-10 sm:h-9 text-sm rounded-lg border-[#e5e7eb] bg-[#f7f8fa] text-[#111318] placeholder:text-[#a0a4ab]"
                  />
                  <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))} />
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="후기를 남겨주세요..."
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm((f) => ({ ...f, content: e.target.value }))}
                    className="flex-1 resize-none text-sm rounded-lg border-[#e5e7eb] bg-[#f7f8fa] text-[#111318] placeholder:text-[#a0a4ab] min-h-[56px]"
                    rows={2}
                  />
                  <Button
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                    aria-label="후기 등록"
                    className="self-end bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-lg h-11 w-11 sm:h-[60px] sm:w-[60px] flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {submitError && <p className="text-xs text-red-500">{submitError}</p>}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
