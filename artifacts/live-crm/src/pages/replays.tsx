import { useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlaySquare, Calendar, Users, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">다시보기</h1>
        <p className="text-muted-foreground">종료된 라이브 스트리밍을 다시 시청할 수 있습니다.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card">
              <Skeleton className="h-64 w-full rounded-t-lg" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : replays && replays.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {replays.map((replay) => {
            const youtubeId = replay.youtubeUrl ? extractYoutubeId(replay.youtubeUrl) : null;

            return (
              <Card key={replay.id} className="bg-card flex flex-col overflow-hidden">
                <div className="w-full aspect-video bg-muted overflow-hidden">
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
                    ></iframe>
                  ) : replay.thumbnailUrl ? (
                    <img src={replay.thumbnailUrl} alt={replay.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                      <PlaySquare className="h-12 w-12 text-muted-foreground opacity-20" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(replay.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{replay.registrationCount}명 참석</span>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-1">{replay.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">{replay.description || "설명이 없습니다."}</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border bg-card/50">
                  {replay.youtubeUrl && !youtubeId ? (
                    <a href={replay.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="secondary" className="w-full" data-testid={`btn-external-link-${replay.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        외부 링크로 보기
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" className="w-full" disabled data-testid={`btn-replay-info-${replay.id}`}>
                      {youtubeId ? "위 영상 재생" : "영상 링크 없음"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="py-16 text-center">
            <PlaySquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">다시보기 영상이 없습니다</h3>
            <p className="text-muted-foreground">아직 종료된 라이브 스트리밍이 없습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
