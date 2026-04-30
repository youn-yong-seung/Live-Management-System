import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Loader2, Users, TrendingUp, Sparkles, Filter, X } from "lucide-react";

interface DashboardData {
  live: { id: number; title: string; scheduledAt: string | null; status: string };
  total: number;
  todayCount: number;
  dailySignups: Array<{ date: string; count: number }>;
  industryBreakdown: Array<{ value: string; count: number }>;
  channelBreakdown: Array<{ value: string; count: number }>;
  skillLevelBreakdown: Array<{ value: string; count: number }>;
  questions: Array<{
    key: string;
    question: string;
    questionType: string;
    options: string[] | null;
    answeredCount: number;
    breakdown: Array<{ value: string; count: number }> | null;
  }>;
  respondents: Array<{
    industry: string | null;
    channels: string[] | null;
    skillLevel: string | null;
    answers: Record<string, string | string[]>;
  }>;
}

type Filter =
  | { type: "industry"; value: string }
  | { type: "channel"; value: string }
  | { type: "skill"; value: string }
  | { type: "answer"; questionKey: string; value: string }
  | null;

const PALETTE = ["#CC9965", "#00E5E5", "#A78BFA", "#F59E0B", "#10B981", "#EC4899", "#3B82F6", "#F43F5E", "#84CC16", "#06B6D4"];

function skillLabel(s: string): string {
  if (s === "beginner") return "초보";
  if (s === "intermediate") return "중급";
  if (s === "advanced") return "고급";
  return s;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
}

function tallyClient(values: Array<string | null | undefined>): Array<{ value: string; count: number }> {
  const m = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export default function LiveDashboard() {
  const [, params] = useRoute("/lives/:id/dashboard");
  const liveId = parseInt(params?.id ?? "0", 10);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    try {
      const r = await fetch(`/api/lives/${liveId}/public-dashboard`);
      if (!r.ok) throw new Error("불러오기 실패");
      const json = (await r.json()) as DashboardData;
      setData(json);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!liveId) return;
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  const filteredRespondents = useMemo(() => {
    if (!data) return [];
    if (!filter) return data.respondents;
    return data.respondents.filter((r) => {
      if (filter.type === "industry") return r.industry === filter.value;
      if (filter.type === "channel") return (r.channels ?? []).includes(filter.value);
      if (filter.type === "skill") return r.skillLevel === filter.value;
      if (filter.type === "answer") {
        const v = r.answers[filter.questionKey];
        if (Array.isArray(v)) return v.map(String).includes(filter.value);
        return String(v ?? "") === filter.value;
      }
      return true;
    });
  }, [data, filter]);

  const filteredCount = filteredRespondents.length;

  // 필터 적용 시 각 분포 재계산. 미적용 시 서버 응답 그대로.
  const view = useMemo(() => {
    if (!data) return null;
    if (!filter) {
      return {
        total: data.total,
        industryBreakdown: data.industryBreakdown,
        channelBreakdown: data.channelBreakdown,
        skillLevelBreakdown: data.skillLevelBreakdown,
        questions: data.questions,
      };
    }
    const ind = tallyClient(filteredRespondents.map((r) => r.industry));
    const skill = tallyClient(filteredRespondents.map((r) => r.skillLevel));
    const channelFlat: string[] = [];
    for (const r of filteredRespondents) if (r.channels) channelFlat.push(...r.channels);
    const ch = tallyClient(channelFlat);
    const questions = data.questions.map((q) => {
      if (q.breakdown === null) return { ...q, answeredCount: filteredRespondents.filter((r) => r.answers[q.key] !== undefined).length };
      const m = new Map<string, number>();
      let answered = 0;
      for (const r of filteredRespondents) {
        const ans = r.answers[q.key];
        if (ans === undefined || ans === null) continue;
        const arr = Array.isArray(ans) ? ans : [ans];
        const has = arr.some((v) => String(v).trim() !== "");
        if (!has) continue;
        answered += 1;
        for (const v of arr) {
          const k = String(v).trim();
          if (!k) continue;
          m.set(k, (m.get(k) ?? 0) + 1);
        }
      }
      return {
        ...q,
        answeredCount: answered,
        breakdown: Array.from(m.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
      };
    });
    return {
      total: filteredRespondents.length,
      industryBreakdown: ind,
      channelBreakdown: ch,
      skillLevelBreakdown: skill,
      questions,
    };
  }, [data, filter, filteredRespondents]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050A0A" }}>
        <Loader2 className="h-6 w-6 animate-spin text-[#CC9965]" />
      </div>
    );
  }
  if (error || !data || !view) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050A0A" }}>
        <p className="text-white/50">{error ?? "데이터 없음"}</p>
      </div>
    );
  }

  const denom = view.total || 1;

  const filterLabel = filter
    ? filter.type === "industry" ? `업종: ${filter.value}`
      : filter.type === "channel" ? `유입: ${filter.value}`
      : filter.type === "skill" ? `AI 수준: ${skillLabel(filter.value)}`
      : `${data.questions.find((q) => q.key === filter.questionKey)?.question ?? ""}: ${filter.value}`
    : null;

  return (
    <div className="min-h-screen text-white" style={{ background: "#050A0A" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[#00E5E5]/60 text-xs font-semibold uppercase tracking-[0.2em] mb-3">LIVE DASHBOARD</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug" style={{ textShadow: "0 0 30px rgba(0,229,229,0.15)" }}>
            {data.live.title}
          </h1>
          {data.live.scheduledAt && (
            <p className="text-white/50 text-sm mt-2">{fmtDate(data.live.scheduledAt)}</p>
          )}
          {updatedAt && (
            <p className="text-white/30 text-[11px] mt-3">
              업데이트: {updatedAt.toLocaleTimeString("ko-KR")} · 30초마다 자동 갱신
            </p>
          )}
        </div>

        {/* Filter pill */}
        {filter && (
          <div className="mb-6 flex items-center justify-center">
            <button
              onClick={() => setFilter(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#CC9965]/15 text-[#CC9965] border border-[#CC9965]/40 hover:bg-[#CC9965]/25"
            >
              <Filter className="h-3.5 w-3.5" />
              필터: {filterLabel} ({filteredCount}명)
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <KpiCard
            icon={<Users className="h-4 w-4" />}
            label={filter ? "필터링된 신청자" : "총 신청자"}
            value={`${view.total}명`}
            sub={filter ? `전체 ${data.total}명 중` : undefined}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="오늘 신청"
            value={`${data.todayCount}명`}
            accent="#00E5E5"
          />
          <KpiCard
            icon={<Sparkles className="h-4 w-4" />}
            label="응답 완료율"
            value={view.questions.length === 0 ? "—" : `${pct(view.questions.reduce((s, q) => s + q.answeredCount, 0), view.questions.length * (view.total || 1))}%`}
          />
        </div>

        {/* Daily signups sparkline */}
        {data.dailySignups.length > 0 && (
          <Section title="최근 14일 신청 추이">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#ffffff40" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#ffffff40" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "rgba(5,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                  <Line type="monotone" dataKey="count" stroke="#00E5E5" strokeWidth={2} dot={{ r: 3, fill: "#00E5E5" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* 업종 / 유입 / 스킬 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {view.industryBreakdown.length > 0 && (
            <BreakdownCard
              title="업종 분포"
              data={view.industryBreakdown}
              total={denom}
              variant="pie"
              activeValue={filter?.type === "industry" ? filter.value : undefined}
              onPick={(v) => setFilter(filter?.type === "industry" && filter.value === v ? null : { type: "industry", value: v })}
            />
          )}
          {view.skillLevelBreakdown.length > 0 && (
            <BreakdownCard
              title="AI / 툴 활용 수준"
              data={view.skillLevelBreakdown.map((d) => ({ ...d, value: skillLabel(d.value) }))}
              total={denom}
              variant="pie"
              activeValue={filter?.type === "skill" ? skillLabel(filter.value) : undefined}
              onPick={(v) => {
                const code = v === "초보" ? "beginner" : v === "중급" ? "intermediate" : v === "고급" ? "advanced" : v;
                setFilter(filter?.type === "skill" && filter.value === code ? null : { type: "skill", value: code });
              }}
            />
          )}
          {view.channelBreakdown.length > 0 && (
            <BreakdownCard
              title="유입 경로"
              data={view.channelBreakdown}
              total={denom}
              variant="bar"
              activeValue={filter?.type === "channel" ? filter.value : undefined}
              onPick={(v) => setFilter(filter?.type === "channel" && filter.value === v ? null : { type: "channel", value: v })}
            />
          )}
        </div>

        {/* 질문별 응답 */}
        {view.questions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">설문 응답 분포</h2>
            {view.questions.map((q) => (
              <QuestionCard
                key={q.key}
                question={q.question}
                breakdown={q.breakdown}
                answeredCount={q.answeredCount}
                isFreeText={q.questionType === "text" || q.questionType === "textarea"}
                total={denom}
                activeValue={filter?.type === "answer" && filter.questionKey === q.key ? filter.value : undefined}
                onPick={(v) => setFilter(filter?.type === "answer" && filter.questionKey === q.key && filter.value === v ? null : { type: "answer", questionKey: q.key, value: v })}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-white/30">
          개인정보는 노출되지 않으며, 응답 분포만 집계되어 표시됩니다.
        </p>
      </div>
    </div>
  );
}

/* ── Small components ─────────────────────────────────── */

function KpiCard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-4 sm:p-5"
      style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-2 text-white/50 text-xs">
        <span style={{ color: accent ?? "#CC9965" }}>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold" style={{ color: accent ?? "#fff", textShadow: accent ? `0 0 24px ${accent}40` : undefined }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5 mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function BreakdownCard({
  title, data, total, variant, activeValue, onPick,
}: {
  title: string;
  data: Array<{ value: string; count: number }>;
  total: number;
  variant: "pie" | "bar";
  activeValue?: string;
  onPick: (v: string) => void;
}) {
  const TOP_N = 8;
  const sorted = [...data].slice(0, TOP_N);
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">{title}</h3>
      {variant === "pie" ? (
        <div className="flex items-center gap-3">
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sorted} dataKey="count" nameKey="value" innerRadius={42} outerRadius={66} paddingAngle={2}>
                  {sorted.map((d, i) => (
                    <Cell
                      key={d.value}
                      fill={PALETTE[i % PALETTE.length]}
                      opacity={activeValue && activeValue !== d.value ? 0.3 : 1}
                      style={{ cursor: "pointer" }}
                      onClick={() => onPick(d.value)}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(5,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            {sorted.map((d, i) => (
              <button
                key={d.value}
                onClick={() => onPick(d.value)}
                className={`w-full flex items-center gap-2 text-xs hover:opacity-100 transition-opacity ${activeValue && activeValue !== d.value ? "opacity-40" : "opacity-90"}`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="text-white/70 truncate flex-1 text-left">{d.value}</span>
                <span className="text-white/50 tabular-nums flex-shrink-0">{d.count}명 · {pct(d.count, total)}%</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((d, i) => (
            <button
              key={d.value}
              onClick={() => onPick(d.value)}
              className={`w-full text-left ${activeValue && activeValue !== d.value ? "opacity-40" : ""}`}
            >
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-white/80 truncate">{d.value}</span>
                <span className="text-white/50 tabular-nums">{d.count}명 · {pct(d.count, total)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct(d.count, total)}%`, background: PALETTE[i % PALETTE.length] }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
      {data.length > TOP_N && (
        <p className="text-[10px] text-white/30 mt-2">상위 {TOP_N}개만 표시 · 전체 {data.length}개</p>
      )}
    </div>
  );
}

function QuestionCard({
  question, breakdown, answeredCount, isFreeText, total, activeValue, onPick,
}: {
  question: string;
  breakdown: Array<{ value: string; count: number }> | null;
  answeredCount: number;
  isFreeText: boolean;
  total: number;
  activeValue?: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-white/90 leading-snug">{question}</h3>
        <span className="text-[11px] text-white/40 flex-shrink-0">{answeredCount}명 응답 · {pct(answeredCount, total)}%</span>
      </div>
      {isFreeText ? (
        <p className="text-xs text-white/40 italic">자유 입력 응답 — 개인정보 보호를 위해 분포만 집계 (총 {answeredCount}건)</p>
      ) : !breakdown || breakdown.length === 0 ? (
        <p className="text-xs text-white/30">아직 응답이 없습니다.</p>
      ) : (
        <div className="h-[180px] sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" stroke="#ffffff40" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="value" type="category" stroke="#ffffff60" tick={{ fontSize: 11 }} width={120} interval={0} />
              <Tooltip
                contentStyle={{ background: "rgba(5,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                formatter={(v: number) => [`${v}명 · ${pct(v, answeredCount)}%`, "응답"]}
                cursor={{ fill: "rgba(204,153,101,0.08)" }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(d: any) => onPick(d.value)} style={{ cursor: "pointer" }}>
                {breakdown.map((d, i) => (
                  <Cell
                    key={d.value}
                    fill={PALETTE[i % PALETTE.length]}
                    opacity={activeValue && activeValue !== d.value ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
