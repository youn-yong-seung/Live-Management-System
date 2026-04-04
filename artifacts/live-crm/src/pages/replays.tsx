import { useState } from "react";
import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { ReplayModal } from "@/components/replay-modal";
import { PlaySquare, Calendar, Users, PlayCircle } from "lucide-react";

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function youtubeThumbnail(url: string) {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export default function Replays() {
  const { data: replays, isLoading } = useGetLives(
    { status: "ended" },
    { query: { queryKey: getGetLivesQueryKey({ status: "ended" }) } }
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalReplay, setModalReplay] = useState<NonNullable<typeof replays>[number] | null>(null);

  const allCategories = Array.from(
    new Set((replays ?? []).flatMap((r) => ((r as any).tags as string[] | null) ?? []))
  ).sort();

  const filteredReplays = selectedCategory
    ? (replays ?? []).filter((r) => ((r as any).tags as string[] | null)?.includes(selectedCategory))
    : replays;

  return (
    <div className="space-y-8">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">다시보기</h1>
        <p className="text-gray-500 text-sm">종료된 라이브를 언제든지 다시 시청하세요.</p>
      </div>

      {!isLoading && allCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

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
                onClick={() => setModalReplay(replay)}
              >
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

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
