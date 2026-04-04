import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { PlaySquare, Calendar, Users, ExternalLink } from "lucide-react";

export default function Replays() {
  const { data: replays, isLoading } = useGetLives(
    { status: "ended" },
    { query: { queryKey: getGetLivesQueryKey({ status: "ended" }) } }
  );

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">다시보기</h1>
        <p className="text-gray-500 text-sm">종료된 라이브를 언제든지 다시 시청하세요.</p>
      </div>

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
      ) : replays && replays.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {replays.map((replay) => {
            const youtubeId = replay.youtubeUrl ? extractYoutubeId(replay.youtubeUrl) : null;

            return (
              <div key={replay.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col">
                {/* Video / Thumbnail */}
                <div className="w-full aspect-video bg-gray-50 overflow-hidden">
                  {youtubeId ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={replay.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : replay.thumbnailUrl ? (
                    <img src={replay.thumbnailUrl} alt={replay.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlaySquare className="h-10 w-10 text-gray-200" />
                    </div>
                  )}
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
                  <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-4">{replay.description || "설명이 없습니다."}</p>

                  {replay.youtubeUrl && !youtubeId && (
                    <a href={replay.youtubeUrl} target="_blank" rel="noopener noreferrer">
                      <button
                        className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition-colors"
                        data-testid={`btn-external-link-${replay.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                        외부 링크로 보기
                      </button>
                    </a>
                  )}
                  {youtubeId && (
                    <span className="inline-flex items-center justify-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-full py-1.5 px-3 font-medium" data-testid={`btn-replay-info-${replay.id}`}>
                      <PlaySquare className="h-3.5 w-3.5" />
                      위 영상 재생
                    </span>
                  )}
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
    </div>
  );
}
