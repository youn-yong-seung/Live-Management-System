import { useState, useEffect } from "react";
import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  PlaySquare, Calendar, Users, MessageSquare, X, Star, Send, PlayCircle,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

interface Review {
  id: number;
  name: string;
  rating: number;
  content: string;
  createdAt: string;
}

/* ── Helpers ─────────────────────────────────────────── */

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function youtubeThumbnail(url: string) {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/* ── Star Rating Component ───────────────────────────── */

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

/* ── Main Component ──────────────────────────────────── */

export default function Replays() {
  const { data: replays, isLoading } = useGetLives(
    { status: "ended" },
    { query: { queryKey: getGetLivesQueryKey({ status: "ended" }) } }
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal state
  const [modalReplay, setModalReplay] = useState<(typeof replays extends (infer T)[] | undefined ? T : never) | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 0, content: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Categories
  const allCategories = Array.from(
    new Set((replays ?? []).flatMap((r) => ((r as any).tags as string[] | null) ?? []))
  ).sort();

  const filteredReplays = selectedCategory
    ? (replays ?? []).filter((r) => ((r as any).tags as string[] | null)?.includes(selectedCategory))
    : replays;

  // Load reviews when modal opens
  useEffect(() => {
    if (!modalReplay) return;
    setIsLoadingReviews(true);
    fetch(`/api/lives/${modalReplay.id}/reviews`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => Array.isArray(data) ? setReviews(data) : setReviews([]))
      .catch(() => setReviews([]))
      .finally(() => setIsLoadingReviews(false));
  }, [modalReplay]);

  const handleSubmitReview = async () => {
    if (!modalReplay) return;
    if (!reviewForm.name.trim()) { setSubmitError("이름을 입력해주세요"); return; }
    if (reviewForm.rating === 0) { setSubmitError("별점을 선택해주세요"); return; }
    if (!reviewForm.content.trim()) { setSubmitError("후기를 입력해주세요"); return; }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/lives/${modalReplay.id}/reviews`, {
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

  const openModal = (replay: NonNullable<typeof replays>[number]) => {
    setModalReplay(replay);
    setReviews([]);
    setReviewForm({ name: "", rating: 0, content: "" });
    setSubmitError("");
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">다시보기</h1>
        <p className="text-gray-500 text-sm">종료된 라이브를 언제든지 다시 시청하세요.</p>
      </div>

      {/* Category Filter */}
      {!isLoading && allCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredReplays && filteredReplays.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredReplays.map((replay) => {
            const thumb = replay.youtubeUrl ? youtubeThumbnail(replay.youtubeUrl) : null;

            return (
              <div
                key={replay.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group"
                onClick={() => openModal(replay)}
              >
                {/* Thumbnail with play overlay */}
                <div className="w-full aspect-video bg-gray-100 overflow-hidden relative">
                  {thumb ? (
                    <img src={thumb} alt={replay.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlaySquare className="h-10 w-10 text-gray-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <PlayCircle className="h-8 w-8 text-blue-600 ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(replay.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {replay.registrationCount}명 참석
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-1 mb-2">{replay.title}</h3>
                  {((replay as any).tags as string[] | null)?.length ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {((replay as any).tags as string[]).map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); setSelectedCategory(selectedCategory === tag ? null : tag); }}
                          className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-sm text-gray-500 line-clamp-2 flex-1">{replay.description || "설명이 없습니다."}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 py-20 text-center">
          <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <PlaySquare className="h-6 w-6 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-600 mb-1">다시보기 영상이 없습니다</p>
          <p className="text-sm text-gray-400">아직 종료된 라이브 스트리밍이 없습니다.</p>
        </div>
      )}

      {/* ── Video + Review Modal ──────────────────────── */}
      <Dialog open={!!modalReplay} onOpenChange={(open) => { if (!open) setModalReplay(null); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-white rounded-2xl overflow-hidden flex flex-col lg:flex-row">
          {modalReplay && (() => {
            const youtubeId = modalReplay.youtubeUrl ? extractYoutubeId(modalReplay.youtubeUrl) : null;
            return (
              <>
                {/* Left: Video section */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Video */}
                  <div className="w-full aspect-video bg-black flex-shrink-0">
                    {youtubeId ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                        title={modalReplay.title}
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
                  {/* Video info */}
                  <div className="p-5 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{modalReplay.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-2">{modalReplay.description}</p>
                    {((modalReplay as any).tags as string[] | null)?.length ? (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {((modalReplay as any).tags as string[]).map((tag: string) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right: Review section */}
                <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col min-h-0 max-h-[40vh] lg:max-h-none">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="font-bold text-gray-900 text-sm">후기</span>
                    <span className="text-xs text-gray-400">({reviews.length})</span>
                  </div>

                  {/* Review list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {isLoadingReviews ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                      </div>
                    ) : reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.id} className="bg-gray-50 rounded-xl p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-gray-800">{review.name}</span>
                            <StarRating value={review.rating} />
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        아직 후기가 없습니다.<br />첫 후기를 남겨보세요!
                      </div>
                    )}
                  </div>

                  {/* Review form */}
                  <div className="border-t border-gray-100 p-4 flex-shrink-0 space-y-3 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="이름"
                        value={reviewForm.name}
                        onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                        className="flex-1 h-9 text-sm rounded-lg border-gray-200"
                      />
                      <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))} />
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="후기를 남겨주세요..."
                        value={reviewForm.content}
                        onChange={(e) => setReviewForm((f) => ({ ...f, content: e.target.value }))}
                        className="flex-1 resize-none text-sm rounded-lg border-gray-200 min-h-[60px]"
                        rows={2}
                      />
                      <Button
                        onClick={handleSubmitReview}
                        disabled={isSubmitting}
                        className="self-end bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-[60px] w-[60px] flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {submitError && <p className="text-xs text-red-500">{submitError}</p>}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
