import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Video, Calendar, Activity, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";

export default function Home() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: activeLives, isLoading: isLivesLoading } = useGetLives(
    { status: "live" },
    { query: { queryKey: getGetLivesQueryKey({ status: "live" }) } }
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">대시보드</h1>
        <p className="text-muted-foreground">윤자동 라이브 CRM 현황 요약입니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">현재 진행중인 라이브</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="stat-active-lives">{summary?.activeLivesCount || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">이번 주 예정 라이브</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="stat-upcoming">{summary?.upcomingThisWeekCount || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 신청자 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="stat-total-registrations">{summary?.totalRegistrationsCount || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 라이브</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="stat-total-lives">{summary?.totalLivesCount || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">진행중인 라이브</h2>
        {isLivesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : activeLives && activeLives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLives.map((live) => (
              <Card key={live.id} className="border-primary/50 bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row h-full">
                  {live.thumbnailUrl && (
                    <div className="w-full sm:w-48 h-32 sm:h-auto bg-muted">
                      <img src={live.thumbnailUrl} alt={live.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
                      <span className="text-xs font-medium text-destructive">LIVE</span>
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-1">{live.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{live.description}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatDate(live.scheduledAt)}</span>
                      {live.youtubeUrl && (
                        <a href={live.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
                          <PlayCircle className="h-4 w-4" />
                          입장하기
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card/50 border-dashed">
            <CardContent className="py-10 text-center">
              <Video className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">현재 진행중인 라이브가 없습니다.</p>
              <Link href="/lives" className="block mt-4">
                <Button variant="outline" data-testid="link-upcoming">예정된 라이브 보기</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
