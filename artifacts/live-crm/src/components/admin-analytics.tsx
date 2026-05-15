import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import {
  Users, Eye, MousePointer, Clock, TrendingDown, Activity,
  Loader2, RefreshCw, ExternalLink, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Summary {
  total_page_views: number;
  unique_visitors: number;
  total_sessions: number;
  avg_session_seconds: number;
  bounce_rate_pct: number;
  total_clicks: number;
}
interface DailyRow { day: string; page_views: number; unique_visitors: number; sessions: number; }
interface HourlyRow { hour: number; page_views: number; unique_visitors: number; }
interface PageRow { path: string; page_views: number; unique_visitors: number; avg_seconds: number; }
interface ClickRow { label: string; target: string; clicks: number; unique_clickers: number; }
interface ReferrerRow { source: string; visits: number; }

interface AnalyticsData {
  days: number;
  tz: string;
  summary: Summary;
  daily: DailyRow[];
  hourly: HourlyRow[];
  topPages: PageRow[];
  topClicks: ClickRow[];
  referrers: ReferrerRow[];
}

const PERIODS = [
  { label: "7일", value: 7 },
  { label: "30일", value: 30 },
  { label: "90일", value: 90 },
];

function fmtDuration(sec: number): string {
  if (!sec || sec < 1) return "0초";
  if (sec < 60) return `${Math.round(sec)}초`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  const h = Math.floor(m / 60);
  return `${h}시간 ${m % 60}분`;
}

function fmtNumber(n: number): string {
  return Number(n || 0).toLocaleString("ko-KR");
}

function getAdminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("crm_admin_token") || "";
  return token ? { "x-admin-token": token } : {};
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const load = async (d = days) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/site-analytics?days=${d}`, {
        headers: getAdminHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); /* eslint-disable-next-line */ }, [days]);

  const dailyChartData = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d) => ({
      ...d,
      label: d.day.slice(5), // MM-DD
    }));
  }, [data]);

  const hourlyChartData = useMemo(() => {
    if (!data) return [];
    const m = new Map(data.hourly.map((h) => [h.hour, h]));
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h}시`,
      page_views: m.get(h)?.page_views ?? 0,
      unique_visitors: m.get(h)?.unique_visitors ?? 0,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* ── Header / period selector ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            방문자 분석
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            홈페이지 트래픽 · 클릭 · 체류시간 — 운영 ROI 측정
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  days === p.value ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
          데이터 로드 실패: {error}
        </div>
      )}

      {!data && loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={<Eye className="h-4 w-4" />}
              label="페이지 뷰"
              value={fmtNumber(data.summary.total_page_views)}
              accent="text-blue-600 bg-blue-50"
            />
            <SummaryCard
              icon={<Users className="h-4 w-4" />}
              label="순방문자"
              value={fmtNumber(data.summary.unique_visitors)}
              accent="text-emerald-600 bg-emerald-50"
            />
            <SummaryCard
              icon={<Activity className="h-4 w-4" />}
              label="세션"
              value={fmtNumber(data.summary.total_sessions)}
              accent="text-indigo-600 bg-indigo-50"
              hint={data.summary.unique_visitors > 0
                ? `1인당 ${(data.summary.total_sessions / data.summary.unique_visitors).toFixed(1)}회`
                : undefined}
            />
            <SummaryCard
              icon={<Clock className="h-4 w-4" />}
              label="평균 체류시간"
              value={fmtDuration(data.summary.avg_session_seconds)}
              accent="text-amber-600 bg-amber-50"
            />
            <SummaryCard
              icon={<MousePointer className="h-4 w-4" />}
              label="총 클릭수"
              value={fmtNumber(data.summary.total_clicks)}
              accent="text-purple-600 bg-purple-50"
              hint={data.summary.total_page_views > 0
                ? `PV당 ${(data.summary.total_clicks / data.summary.total_page_views).toFixed(2)}회`
                : undefined}
            />
            <SummaryCard
              icon={<TrendingDown className="h-4 w-4" />}
              label="이탈률 (1PV)"
              value={`${data.summary.bounce_rate_pct.toFixed(1)}%`}
              accent="text-rose-600 bg-rose-50"
            />
            <SummaryCard
              icon={<Globe className="h-4 w-4" />}
              label="기간"
              value={`${data.days}일`}
              accent="text-gray-600 bg-gray-100"
              hint={data.tz}
            />
            <SummaryCard
              icon={<Activity className="h-4 w-4" />}
              label="페이지/세션"
              value={data.summary.total_sessions > 0
                ? (data.summary.total_page_views / data.summary.total_sessions).toFixed(1)
                : "0"}
              accent="text-cyan-600 bg-cyan-50"
            />
          </div>

          {/* ── Daily area chart ── */}
          <ChartCard title="일별 방문자 추이" subtitle={`최근 ${data.days}일`}>
            {dailyChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradUV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="page_views" name="페이지뷰" stroke="#6366F1" strokeWidth={2} fill="url(#gradPV)" />
                  <Area type="monotone" dataKey="unique_visitors" name="순방문자" stroke="#10B981" strokeWidth={2} fill="url(#gradUV)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── Hourly bar chart ── */}
          <ChartCard title="시간대별 방문 분포" subtitle={`${data.tz} 기준, 0~23시`}>
            {hourlyChartData.every((h) => h.page_views === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hourlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="page_views" name="페이지뷰" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── Top pages + clicks side-by-side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankTable
              title="가장 많이 본 페이지"
              icon={<Eye className="h-4 w-4 text-blue-500" />}
              rows={data.topPages}
              keyOf={(r) => r.path}
              cols={[
                { label: "페이지", value: (r) => (
                  <span className="font-medium text-gray-900 truncate inline-flex items-center gap-1">
                    {r.path}
                    {r.path && r.path.startsWith("/") && (
                      <a href={r.path} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 text-blue-500" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                ), flex: true },
                { label: "PV", value: (r) => fmtNumber(r.page_views), align: "right" },
                { label: "UV", value: (r) => fmtNumber(r.unique_visitors), align: "right", muted: true },
                { label: "평균체류", value: (r) => fmtDuration(r.avg_seconds), align: "right", muted: true },
              ]}
              empty="페이지뷰 데이터가 없습니다."
            />

            <RankTable
              title="가장 많이 클릭된 항목"
              icon={<MousePointer className="h-4 w-4 text-purple-500" />}
              rows={data.topClicks}
              keyOf={(r) => r.label + "::" + r.target}
              cols={[
                { label: "항목", value: (r) => (
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.label}</p>
                    {r.target && r.target !== r.label && (
                      <p className="text-[11px] text-gray-400 truncate">{r.target}</p>
                    )}
                  </div>
                ), flex: true },
                { label: "클릭", value: (r) => fmtNumber(r.clicks), align: "right" },
                { label: "고유", value: (r) => fmtNumber(r.unique_clickers), align: "right", muted: true },
              ]}
              empty="클릭 데이터가 없습니다."
            />
          </div>

          {/* ── Referrer ── */}
          <ChartCard title="유입 채널" subtitle={`최근 ${data.days}일 페이지뷰 기준`}>
            {data.referrers.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="space-y-2.5">
                {data.referrers.map((r) => {
                  const max = data.referrers[0].visits || 1;
                  const pct = Math.max(2, Math.round((r.visits / max) * 100));
                  return (
                    <div key={r.source} className="flex items-center gap-3">
                      <span className="w-32 sm:w-40 text-sm text-gray-700 truncate flex-shrink-0">{r.source}</span>
                      <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm font-semibold text-gray-900 text-right tabular-nums">{fmtNumber(r.visits)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          <p className="text-xs text-gray-400 pt-2">
            * 트래킹은 <code>/admin</code> · <code>/editor</code> · <code>/auth/callback</code>을 제외한 모든 페이지에서 자동 수집됩니다. (DNT 설정 시 옵트아웃)
          </p>
        </>
      )}
    </div>
  );
}

/* ── Small components ──────────────────────────────── */

function SummaryCard({
  icon, label, value, accent, hint,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; accent: string; hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent}`}>{icon}</div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-gray-900 tabular-nums">{value}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-gray-400">
      아직 수집된 데이터가 없습니다.
    </div>
  );
}

interface Col<R> {
  label: string;
  value: (r: R) => React.ReactNode;
  align?: "left" | "right";
  flex?: boolean;
  muted?: boolean;
}

function RankTable<R>({
  title, icon, rows, cols, keyOf, empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: R[];
  cols: Col<R>[];
  keyOf: (r: R) => string;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">{empty}</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <div key={keyOf(r)} className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="w-6 text-xs font-bold text-gray-400 tabular-nums flex-shrink-0">{i + 1}</span>
              {cols.map((c, ci) => (
                <div
                  key={ci}
                  className={`text-sm ${c.flex ? "flex-1 min-w-0" : "flex-shrink-0"} ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.muted ? "text-gray-500" : "text-gray-900"}`}
                >
                  {c.value(r)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
