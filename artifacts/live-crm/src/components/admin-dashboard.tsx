import { useEffect, useMemo, useState } from "react";
import {
  Users, UserCheck, Star, TrendingUp, RefreshCw, Loader2,
  Sparkles, Radio, Briefcase, Clock, Crown, ArrowUpRight, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend, AreaChart, Area, ComposedChart,
} from "recharts";

/* ── API helper ─────────────────────────────────────── */

function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("crm_admin_token");
  return fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Admin-Token": token || "", ...opts?.headers },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "요청 실패");
    if (r.status === 204) return null as T;
    return r.json();
  });
}

/* ── Types ──────────────────────────────────────────── */

interface DashboardData {
  overview: {
    total_members: number;
    total_registrations: number;
    total_lives: number;
    returning_members: number;
    super_fans: number;
    members_last_7d: number;
  } | null;
  channelPerformance: Array<{
    source_name: string;
    category: string;
    unique_members: number;
    total_registrations: number;
    returning_members: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    unique_members: number;
    total_registrations: number;
  }>;
  livePerformance: Array<{
    live_id: number;
    title: string;
    scheduled_at: string | null;
    status: string;
    total_apps: number;
    new_signups: number;
    returning: number;
  }>;
  industryDistribution: Array<{ industry: string; count: number }>;
  superFans: Array<{
    phone_n: string;
    phone: string;
    name: string;
    email: string | null;
    industry: string | null;
    registration_count: number;
    first_seen: string;
    last_seen: string;
    live_ids: number[];
  }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  weeklyTrend: Array<{
    live_id: number;
    title: string;
    scheduled_at: string | null;
    new_signups: number;
    returning: number;
  }>;
  generatedAt: string;
}

/* ── Helpers ────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  유튜브: "#EF4444",
  인스타: "#EC4899",
  스레드: "#8B5CF6",
  오픈채팅방: "#FACC15",
  지인: "#10B981",
  SNS: "#3B82F6",
  기타: "#6B7280",
};

function colorFor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#6B7280";
}

function pct(num: number, den: number): string {
  if (!den) return "0%";
  return `${Math.round((num / den) * 1000) / 10}%`;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatDateShort(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/* ── KPI Card ──────────────────────────────────────── */

function KpiCard({
  icon: Icon, label, value, sublabel, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">{value}</div>
      <div className="mt-1.5 text-sm text-gray-500 font-medium">{label}</div>
      {sublabel && <div className="mt-2 text-xs text-gray-400">{sublabel}</div>}
    </div>
  );
}

/* ── Section card wrapper ──────────────────────────── */

function SectionCard({
  title, subtitle, action, children, className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {action && <div className="ml-3 flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────── */

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Returning attendees trend ─────────────── */
  type TrendPoint = { liveId: number; title: string; scheduledAt: string | null; newCount: number; returningCount: number; totalCount: number; returningRate: number };
  type SourceRow = { liveId: number; title: string; scheduledAt: string | null; overlapCount: number };
  type TrendResponse = { trend: TrendPoint[]; latestLive: { liveId: number; title: string; totalCount: number; returningCount: number } | null; latestSource: SourceRow[] };
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);

  const load = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [result, trend] = await Promise.all([
        apiFetch<DashboardData>("/admin/dashboard"),
        apiFetch<TrendResponse>("/returning-attendees-trend").catch(() => null),
      ]);
      setData(result);
      setTrendData(trend);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "데이터 로드 실패";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const ov = data?.overview;
  const returningRate = ov && ov.total_members ? ov.returning_members / ov.total_members : 0;
  const avgPerLive = ov && ov.total_lives ? ov.total_registrations / ov.total_lives : 0;

  /* ── Channel data prep — top 10 by registrations ── */
  const topChannels = useMemo(() => {
    if (!data) return [];
    return [...data.channelPerformance]
      .sort((a, b) => b.total_registrations - a.total_registrations)
      .slice(0, 10)
      .map((c) => ({
        ...c,
        displayName: truncate(c.source_name, 22),
        returningRate: c.unique_members ? Math.round((c.returning_members / c.unique_members) * 100) : 0,
      }));
  }, [data]);

  const livePerf = useMemo(() => {
    if (!data) return [];
    return data.livePerformance
      .filter((l) => l.total_apps > 0)
      .map((l) => ({
        ...l,
        shortTitle: truncate(l.title.replace(/\|.*$/, "").trim(), 28),
        date: formatDateShort(l.scheduled_at),
      }));
  }, [data]);

  const hourly = useMemo(() => {
    if (!data) return [];
    const filled: { hour: number; count: number; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      const hit = data.hourlyDistribution.find((x) => x.hour === h);
      filled.push({ hour: h, count: hit?.count ?? 0, label: `${h}시` });
    }
    return filled;
  }, [data]);

  const weeklyTrend = useMemo(() => {
    if (!data) return [];
    return data.weeklyTrend.map((t) => ({
      ...t,
      shortTitle: truncate(t.title.replace(/\|.*$/, "").trim(), 18),
      date: formatDateShort(t.scheduled_at),
      total: t.new_signups + t.returning,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-medium">대시보드 로드 실패</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <Button onClick={() => load(true)} className="mt-4" variant="outline">다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">비즈니스 대시보드</h2>
          <p className="text-sm text-gray-500 mt-1">
            마지막 갱신: {new Date(data.generatedAt).toLocaleString("ko-KR")}
          </p>
        </div>
        <Button
          onClick={() => load(false)}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="gap-2"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          새로고침
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="총 회원수"
          value={formatNum(ov?.total_members ?? 0)}
          sublabel={`라이브 ${ov?.total_lives ?? 0}회 누적`}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="총 신청수"
          value={formatNum(ov?.total_registrations ?? 0)}
          sublabel={`라이브당 평균 ${Math.round(avgPerLive)}건`}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          icon={UserCheck}
          label="재방문률"
          value={pct(ov?.returning_members ?? 0, ov?.total_members ?? 0)}
          sublabel={`재방문 회원 ${formatNum(ov?.returning_members ?? 0)}명`}
          accent="bg-violet-50 text-violet-600"
        />
        <KpiCard
          icon={Crown}
          label="슈퍼팬 (3회+)"
          value={formatNum(ov?.super_fans ?? 0)}
          sublabel={`최근 7일 신규 ${formatNum(ov?.members_last_7d ?? 0)}명`}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Live Performance — 큰 차트 (가장 중요) */}
      <SectionCard
        title="라이브별 성과 (신규 vs 재참여)"
        subtitle="신규 유입과 코어 팬 재참여 비율을 한눈에 — 콘텐츠가 충성도를 만들고 있는지 측정"
      >
        {weeklyTrend.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyTrend}
                margin={{ top: 10, right: 16, left: 0, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="shortTitle"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    `${formatNum(value)}명`,
                    name === "new_signups" ? "신규" : "재참여",
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => (value === "new_signups" ? "신규 유입" : "재참여")}
                />
                <Bar dataKey="new_signups" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="returning" stackId="a" fill="#A78BFA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">데이터 없음</p>
        )}
      </SectionCard>

      {/* Channel Performance + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="유입경로 TOP 10"
          subtitle="채널별 unique 회원 + 재방문률 — 마케팅 예산 배분 결정"
          className="lg:col-span-2"
        >
          {topChannels.length > 0 ? (
            <div className="space-y-2.5">
              {topChannels.map((c) => {
                const maxRegs = topChannels[0]?.total_registrations || 1;
                const widthPct = (c.total_registrations / maxRegs) * 100;
                return (
                  <div key={c.source_name} className="group">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colorFor(c.category) }}
                        />
                        <span className="text-sm text-gray-700 font-medium truncate" title={c.source_name}>
                          {c.source_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0 tabular-nums">
                        <span>{formatNum(c.unique_members)}명</span>
                        <span className="text-gray-300">·</span>
                        <span>{formatNum(c.total_registrations)}건</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.returningRate >= 30 ? "bg-violet-50 text-violet-700"
                            : c.returningRate >= 15 ? "bg-blue-50 text-blue-700"
                            : "bg-gray-50 text-gray-500"
                          }`}
                          title="이 채널 유입자의 재방문률"
                        >
                          재방문 {c.returningRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: colorFor(c.category),
                          opacity: 0.85,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">데이터 없음</p>
          )}
        </SectionCard>

        <SectionCard
          title="카테고리별 합산"
          subtitle="채널 유형별 누적 성과"
        >
          {data.categoryPerformance.length > 0 ? (
            <div className="space-y-3">
              {data.categoryPerformance.map((c) => {
                const maxRegs = Math.max(...data.categoryPerformance.map((x) => x.total_registrations));
                const widthPct = (c.total_registrations / maxRegs) * 100;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{c.category}</span>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {formatNum(c.unique_members)}명 · {formatNum(c.total_registrations)}건
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: colorFor(c.category),
                          opacity: 0.85,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">데이터 없음</p>
          )}
        </SectionCard>
      </div>

      {/* Live performance table + Hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="라이브별 상세 성과"
          subtitle="콘텐츠 주제별 반응 — 다음 라이브 주제 결정에 활용"
          className="lg:col-span-2"
        >
          {livePerf.length > 0 ? (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500">제목</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 text-right whitespace-nowrap">총 신청</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 text-right whitespace-nowrap">신규</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 text-right whitespace-nowrap">재참여</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 text-right whitespace-nowrap">재참여율</th>
                  </tr>
                </thead>
                <tbody>
                  {livePerf.map((l) => {
                    const rate = l.total_apps ? Math.round((l.returning / l.total_apps) * 100) : 0;
                    return (
                      <tr key={l.live_id} className="border-b border-gray-50 hover:bg-gray-50/40">
                        <td className="py-3 px-2">
                          <div className="text-sm text-gray-900 font-medium" title={l.title}>
                            {l.shortTitle}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {l.date} · #{l.live_id}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums font-semibold text-gray-900">{formatNum(l.total_apps)}</td>
                        <td className="py-3 px-2 text-right tabular-nums text-blue-600">{formatNum(l.new_signups)}</td>
                        <td className="py-3 px-2 text-right tabular-nums text-violet-600">{formatNum(l.returning)}</td>
                        <td className="py-3 px-2 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${
                            rate >= 30 ? "bg-violet-50 text-violet-700"
                            : rate >= 15 ? "bg-blue-50 text-blue-700"
                            : "bg-gray-50 text-gray-500"
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">데이터 없음</p>
          )}
        </SectionCard>

        <SectionCard
          title="시간대별 신청 패턴"
          subtitle="알림톡·푸시 발송 골든타임 (KST)"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  ticks={[0, 6, 12, 18, 23]}
                  tickFormatter={(v) => `${v}시`}
                />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                  formatter={(value: number) => [`${formatNum(value)}건`, "신청"]}
                  labelFormatter={(label) => `${label}시`}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#hourlyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Industry + Super Fans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="산업 분포"
          subtitle="청중 직군별 비중 — 콘텐츠 사례 선택"
        >
          {data.industryDistribution.length > 0 ? (
            <div className="space-y-2.5">
              {data.industryDistribution.map((ind, idx) => {
                const max = data.industryDistribution[0]?.count || 1;
                const widthPct = (ind.count / max) * 100;
                const total = data.industryDistribution.reduce((s, x) => s + x.count, 0);
                return (
                  <div key={ind.industry}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium truncate pr-2" title={ind.industry}>
                        {ind.industry}
                      </span>
                      <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
                        {formatNum(ind.count)}명 · {pct(ind.count, total)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: idx < 3 ? "#3B82F6" : "#94A3B8",
                          opacity: idx < 3 ? 0.85 : 0.6,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">데이터 없음</p>
          )}
        </SectionCard>

        <SectionCard
          title="🏆 슈퍼팬 명단 (3회 이상 신청)"
          subtitle="베타테스터·1:1 케어 우선 타겟 — 코어층 21명"
          className="lg:col-span-2"
        >
          {data.superFans.length > 0 ? (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500">이름</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">연락처</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 hidden lg:table-cell">산업</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 text-center whitespace-nowrap">신청</th>
                    <th className="pb-2 px-2 text-xs font-medium text-gray-500 text-right hidden md:table-cell whitespace-nowrap">최근</th>
                  </tr>
                </thead>
                <tbody>
                  {data.superFans.map((f) => (
                    <tr key={f.phone_n} className="border-b border-gray-50 hover:bg-amber-50/30">
                      <td className="py-2.5 px-2">
                        <div className="text-sm text-gray-900 font-medium">{f.name}</div>
                        {f.email && (
                          <div className="text-[11px] text-gray-400 truncate max-w-[180px]" title={f.email}>
                            {f.email}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-gray-500 tabular-nums hidden md:table-cell whitespace-nowrap">
                        {f.phone}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-gray-600 hidden lg:table-cell">
                        {f.industry || "-"}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold tabular-nums">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                          {f.registration_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-gray-400 hidden md:table-cell whitespace-nowrap">
                        {formatDateShort(f.last_seen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">슈퍼팬 없음</p>
          )}
        </SectionCard>
      </div>

      {/* 라이브별 재신청률 추이 + 최신 라이브 출처 분포 */}
      <SectionCard
        title="라이브별 재신청률 추이"
        subtitle="시간이 지날수록 충성 신청자 비중이 늘어나는지 확인 — 막대=신규/재신청 수, 선=재신청률(%)"
      >
        {trendData && trendData.trend.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            <div className="lg:col-span-2 h-64 sm:h-72 -mx-2 sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trendData.trend.map((t) => ({
                    ...t,
                    label: `#${t.liveId}`,
                    longLabel: `#${t.liveId} · ${formatDateShort(t.scheduledAt)}`,
                    shortTitle: truncate(t.title.replace(/\|.*$/, "").trim(), 22),
                  }))}
                  margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={8}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                    width={32}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12, padding: "8px 10px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "재신청률") return [`${value}%`, name];
                      return [`${value.toLocaleString()}명`, name];
                    }}
                    labelFormatter={(_label, payload) => {
                      const p = payload?.[0]?.payload as { shortTitle?: string; longLabel?: string } | undefined;
                      return p?.shortTitle ? `${p.longLabel} — ${p.shortTitle}` : (p?.longLabel ?? _label);
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconSize={10} />
                  <Bar yAxisId="left" dataKey="newCount" stackId="a" fill="#3B82F6" name="신규" />
                  <Bar yAxisId="left" dataKey="returningCount" stackId="a" fill="#F59E0B" name="재신청" radius={[5, 5, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="returningRate" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: "#10B981" }} name="재신청률" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:border-l lg:border-gray-100 lg:pl-6 pt-2 lg:pt-0">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-900">최신 라이브 재신청자 출처</h4>
              </div>
              {trendData.latestLive ? (
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  <span className="font-semibold text-gray-700">#{trendData.latestLive.liveId}</span> 신청자 <span className="font-semibold tabular-nums">{trendData.latestLive.totalCount}</span>명 중 재신청 <span className="font-semibold text-amber-600 tabular-nums">{trendData.latestLive.returningCount}</span>명이 어디서 왔는지:
                </p>
              ) : null}
              {trendData.latestSource.length > 0 ? (
                <div className="space-y-2">
                  {trendData.latestSource.map((s) => {
                    const max = trendData.latestSource[0]?.overlapCount || 1;
                    const widthPct = (s.overlapCount / max) * 100;
                    return (
                      <div key={s.liveId}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-xs text-gray-700 font-medium truncate flex-1 min-w-0" title={s.title}>
                            #{s.liveId} · {truncate(s.title.replace(/\|.*$/, "").trim(), 22)}
                          </span>
                          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">{s.overlapCount}명</span>
                        </div>
                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-4 text-center">출처 데이터 없음</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-12 text-center">데이터 없음 (라이브 1개 이상 + 신청자 필요)</p>
        )}
      </SectionCard>

      {/* Footer note */}
      <div className="bg-gradient-to-br from-blue-50 via-violet-50 to-pink-50 rounded-2xl p-5 border border-blue-100">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 leading-relaxed">
            <strong className="text-gray-900">읽는 법:</strong>
            {" "}이 대시보드의 핵심은 <strong>채널별 재방문률</strong>(어디서 온 사람이 진짜 팬이 되는지)과
            <strong> 라이브별 재참여율</strong>(콘텐츠가 코어층을 만들고 있는지) 두 축이에요.
            재방문률이 30% 이상인 채널은 <em>예산 두 배로</em>, 라이브 재참여율이 우상향이면 <em>동일 시리즈를 더 깊게</em>.
          </div>
        </div>
      </div>
    </div>
  );
}
