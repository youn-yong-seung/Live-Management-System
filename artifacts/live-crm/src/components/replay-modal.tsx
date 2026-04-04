import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaySquare, MessageSquare, Star, Send } from "lucide-react";

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 0, content: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!replay) return;
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
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-[#080E0E] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col lg:flex-row">
        {replay && (
          <>
            {/* Left: Video */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="w-full aspect-video bg-black flex-shrink-0">
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
              <div className="p-5 flex-shrink-0">
                <h2 className="text-lg font-bold text-white mb-1">{replay.title}</h2>
                <p className="text-sm text-white/50 line-clamp-2">{replay.description}</p>
                {tags?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tags.map((tag) => (
                      <span key={tag} className="text-xs bg-white/5 text-white/40 px-2.5 py-1 rounded-full border border-white/5">{tag}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right: Reviews */}
            <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col min-h-0 max-h-[40vh] lg:max-h-none">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10 flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-[#CC9965]" />
                <span className="font-bold text-white text-sm">후기</span>
                <span className="text-xs text-white/40">({reviews.length})</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {isLoadingReviews ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-white">{review.name}</span>
                        <StarRating value={review.rating} />
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{review.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm">
                    아직 후기가 없습니다.<br />첫 후기를 남겨보세요!
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 p-4 flex-shrink-0 space-y-3 bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="이름"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                    className="flex-1 h-9 text-sm rounded-lg border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                  <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))} />
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="후기를 남겨주세요..."
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm((f) => ({ ...f, content: e.target.value }))}
                    className="flex-1 resize-none text-sm rounded-lg border-white/10 bg-white/5 text-white placeholder:text-white/30 min-h-[60px]"
                    rows={2}
                  />
                  <Button
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                    className="self-end bg-[#CC9965] hover:bg-[#d4a570] text-black rounded-lg h-[60px] w-[60px] flex-shrink-0"
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
