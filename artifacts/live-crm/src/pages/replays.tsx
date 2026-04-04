import { useState } from "react";
import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { ReplayModal } from "@/components/replay-modal";
import { PlaySquare, Calendar, Users, PlayCircle } from "lucide-react";

const gcHover = "glass-card hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300";

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
    <div className="space-y-10">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white mb-1">다시보기</h1>
        <p className="text-white/50 text-sm">종료된 라이브를 언제든지 다시 시청하세요.</p>
      </div>

      {!isLoading && allCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === null
                ? "bg-[#CC9965] text-black"
                : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
            }`}
          >
            전체
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-[#CC9965] text-black"
                  : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
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
            <div key={i} className={`glass-card overflow-hidden`}>
              <Skeleton className="aspect-video w-full bg-white/5" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4 bg-white/5" />
                <Skeleton className="h-4 w-1/2 bg-white/5" />
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
                className={`${gcHover} overflow-hidden flex flex-col cursor-pointer group`}
                onClick={() => setModalReplay(replay)}
              >
                <div className="w-full aspect-video bg-black/30 overflow-hidden relative">
                  {thumb ? (
                    <img src={thumb} alt={replay.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlaySquare className="h-10 w-10 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 bg-[#CC9965]/90 rounded-full flex items-center justify-center shadow-lg">
                      <PlayCircle className="h-8 w-8 text-black" />
                    </div>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(replay.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {replay.registrationCount}명 참석
                    </span>
                  </div>
                  <h3 className="font-bold text-white leading-snug line-clamp-1 mb-2">{replay.title}</h3>
                  {((replay as any).tags as string[] | null)?.length ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {((replay as any).tags as string[]).map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); setSelectedCategory(selectedCategory === tag ? null : tag); }}
                          className="inline-block bg-white/5 text-white/50 text-xs font-medium px-2.5 py-1 rounded-full border border-white/5 cursor-pointer hover:bg-[#CC9965]/10 hover:text-[#CC9965] hover:border-[#CC9965]/20 transition-all"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-sm text-white/40 line-clamp-2 flex-1">{replay.description || "설명이 없습니다."}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`glass-card py-20 text-center`}>
          <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4">
            <PlaySquare className="h-6 w-6 text-white/20" />
          </div>
          <p className="font-semibold text-white/60 mb-1">다시보기 영상이 없습니다</p>
          <p className="text-sm text-white/30">아직 종료된 라이브 스트리밍이 없습니다.</p>
        </div>
      )}

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
