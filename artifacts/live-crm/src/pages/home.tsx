import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetLives, getGetLivesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Link } from "wouter";
import { Activity, Calendar, Users, Video, PlayCircle, ArrowRight } from "lucide-react";

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading,
  accent,
  testId,
}: {
  label: string;
  value: number | undefined;
  icon: typeof Activity;
  loading: boolean;
  accent?: boolean;
  testId?: string;
}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3`}>
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? "bg-blue-50" : "bg-gray-50"}`}>
        <Icon className={`h-4 w-4 ${accent ? "text-blue-500" : "text-gray-400"}`} />
      </span>
    </div>
    {loading ? (
      <Skeleton className="h-9 w-16" />
    ) : (
      <p className="text-3xl font-bold text-gray-900 tracking-tight" data-testid={testId}>{value ?? 0}</p>
    )}
  </div>
);

export default function Home() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: activeLives, isLoading: isLivesLoading } = useGetLives(
    { status: "live" },
    { query: { queryKey: getGetLivesQueryKey({ status: "live" }) } }
  );

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">대시보드</h1>
        <p className="text-gray-500 text-sm">윤자동 라이브 CRM 현황을 한눈에 확인하세요.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="현재 진행 중"
          value={summary?.activeLivesCount}
          icon={Activity}
          loading={isSummaryLoading}
          accent
          testId="stat-active-lives"
        />
        <StatCard
          label="이번 주 예정"
          value={summary?.upcomingThisWeekCount}
          icon={Calendar}
          loading={isSummaryLoading}
          testId="stat-upcoming"
        />
        <StatCard
          label="총 신청자"
          value={summary?.totalRegistrationsCount}
          icon={Users}
          loading={isSummaryLoading}
          testId="stat-total-registrations"
        />
        <StatCard
          label="전체 라이브"
          value={summary?.totalLivesCount}
          icon={Video}
          loading={isSummaryLoading}
          testId="stat-total-lives"
        />
      </div>

      {/* Live Now Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">진행 중인 라이브</h2>
          <Link href="/lives">
            <span className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              전체 보기 <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        {isLivesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : activeLives && activeLives.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeLives.map((live) => (
              <a
                key={live.id}
                href={live.youtubeUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={live.youtubeUrl ? "block cursor-pointer group" : "block pointer-events-none"}
                data-testid={`live-card-${live.id}`}
              >
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 overflow-hidden">
                  {live.thumbnailUrl && (
                    <div className="h-36 w-full overflow-hidden bg-gray-50">
                      <img
                        src={live.thumbnailUrl}
                        alt={live.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wide">LIVE</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1 mb-1">{live.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{live.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(live.scheduledAt)}</span>
                      {live.youtubeUrl && (
                        <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                          <PlayCircle className="h-4 w-4" />
                          입장하기
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 py-14 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <Video className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">현재 진행 중인 라이브가 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">예정된 라이브를 신청해 알림을 받아보세요.</p>
            <Link href="/lives">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700" data-testid="link-upcoming">
                라이브 신청하기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
