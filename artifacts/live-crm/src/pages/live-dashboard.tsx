import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, Filter, X, Quote } from "lucide-react";

interface DashboardData {
  live: { id: number; title: string; scheduledAt: string | null; status: string };
  total: number;
  industryBreakdown: Array<{ value: string; count: number }>;
  skillLevelBreakdown: Array<{ value: string; count: number }>;
  questions: Array<{
    key: string;
    question: string;
    questionType: string;
    options: string[] | null;
    answeredCount: number;
    breakdown: Array<{ value: string; count: number }> | null;
  }>;
  messages: string[];
  respondents: Array<{
    industry: string | null;
    channels: string[] | null;
    skillLevel: string | null;
    answers: Record<string, string | string[]>;
  }>;
}

type Filter =
  | { type: "industry"; value: string }
  | { type: "skill"; value: string }
  | { type: "answer"; questionKey: string; value: string }
  | null;

const PALETTE = ["#6366F1", "#00E5E5", "#A78BFA", "#F59E0B", "#10B981", "#EC4899", "#3B82F6", "#F472B6", "#84CC16", "#06B6D4"];

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
      if (filter.type === "skill") return r.skillLevel === filter.value;
      if (filter.type === "answer") {
        const v = r.answers[filter.questionKey];
        if (Array.isArray(v)) return v.map(String).includes(filter.value);
        return String(v ?? "") === filter.value;
      }
      return true;
    });
  }, [data, filter]);

  const view = useMemo(() => {
    if (!data) return null;
    if (!filter) {
      return {
        total: data.total,
        industryBreakdown: data.industryBreakdown,
        skillLevelBreakdown: data.skillLevelBreakdown,
        questions: data.questions,
      };
    }
    const ind = tallyClient(filteredRespondents.map((r) => r.industry));
    const skill = tallyClient(filteredRespondents.map((r) => r.skillLevel));
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
      skillLevelBreakdown: skill,
      questions,
    };
  }, [data, filter, filteredRespondents]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#ffffff" }}>
        <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
      </div>
    );
  }
  if (error || !data || !view) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#ffffff" }}>
        <p className="text-[#8b8f98]">{error ?? "데이터 없음"}</p>
      </div>
    );
  }

  const filterLabel = filter
    ? filter.type === "industry" ? `업종: ${filter.value}`
      : filter.type === "skill" ? `AI 수준: ${skillLabel(filter.value)}`
      : `${data.questions.find((q) => q.key === filter.questionKey)?.question ?? ""} → ${filter.value}`
    : null;

  return (
    <div
      className="min-h-screen text-[#111318] relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top left, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(0,229,229,0.06) 0%, transparent 50%), #050A0A",
      }}
    >
      {/* Decorative grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* ── HERO ─────────────────────────────────── */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 border border-[#6366F1]/30 bg-[#6366F1]/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#6366F1]">LIVE BRIEFING</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight mb-3 max-w-3xl mx-auto"
            style={{ textShadow: "0 0 60px rgba(99,102,241,0.2)" }}>
            {data.live.title}
          </h1>
          {data.live.scheduledAt && (
            <p className="text-[#8b8f98] text-sm sm:text-base">{fmtDate(data.live.scheduledAt)}</p>
          )}

          {/* Big total count */}
          <div className="mt-12 sm:mt-14">
            <p className="text-[11px] sm:text-xs font-medium tracking-[0.3em] uppercase text-[#8b8f98] mb-3">
              {filter ? "선택된 신청자" : "오늘 모셔본 분"}
            </p>
            <div className="relative inline-block">
              <p
                className="font-extrabold tabular-nums leading-none"
                style={{
                  fontSize: "clamp(80px, 18vw, 180px)",
                  background: "linear-gradient(135deg, #6366F1 0%, #FFD89B 50%, #6366F1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 40px rgba(99,102,241,0.3))",
                }}
              >
                {view.total}
              </p>
              <span className="absolute -bottom-1 -right-8 sm:-right-10 text-2xl sm:text-3xl font-bold text-[#484d57]">명</span>
            </div>
            {filter && (
              <p className="mt-4 text-sm text-[#8b8f98]">전체 {data.total}명 중</p>
            )}
          </div>

          {/* Filter pill */}
          {filter && (
            <div className="mt-8">
              <button
                onClick={() => setFilter(null)}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/40 hover:bg-[#6366F1]/25 transition-colors"
              >
                <Filter className="h-4 w-4" />
                {filterLabel}
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {updatedAt && (
            <p className="text-[#d1d5db] text-[11px] mt-10 tracking-wider">
              UPDATED {updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · 30초마다 자동 갱신
            </p>
          )}
        </div>

        {/* ── DEMOGRAPHICS — 어떤 분들이 ──────────── */}
        {(view.industryBreakdown.length > 0 || view.skillLevelBreakdown.length > 0) && (
          <SectionHeader
            eyebrow="WHO"
            title="어떤 분들이 오셨나요"
          />
        )}
        <div className="grid md:grid-cols-2 gap-5 mb-20">
          {view.industryBreakdown.length > 0 && (
            <DonutCard
              title="직군 / 업종"
              data={view.industryBreakdown}
              total={view.total}
              activeValue={filter?.type === "industry" ? filter.value : undefined}
              onPick={(v) => setFilter(filter?.type === "industry" && filter.value === v ? null : { type: "industry", value: v })}
            />
          )}
          {view.skillLevelBreakdown.length > 0 && (
            <DonutCard
              title="AI / 툴 활용 수준"
              data={view.skillLevelBreakdown.map((d) => ({ ...d, value: skillLabel(d.value), _origValue: d.value }))}
              total={view.total}
              activeValue={filter?.type === "skill" ? skillLabel(filter.value) : undefined}
              onPick={(v, orig) => {
                const code = orig ?? (v === "초보" ? "beginner" : v === "중급" ? "intermediate" : v === "고급" ? "advanced" : v);
                setFilter(filter?.type === "skill" && filter.value === code ? null : { type: "skill", value: code });
              }}
            />
          )}
        </div>

        {/* ── INSIGHTS — 어떤 상황 / 고민 ───────────── */}
        {view.questions.length > 0 && (
          <>
            <SectionHeader
              eyebrow="INSIGHT"
              title="이런 상황에서 오셨어요"
            />
            <div className="space-y-5 mb-20">
              {view.questions.map((q) => (
                <QuestionCard
                  key={q.key}
                  question={q.question}
                  breakdown={q.breakdown}
                  answeredCount={q.answeredCount}
                  isFreeText={q.questionType === "text" || q.questionType === "textarea"}
                  activeValue={filter?.type === "answer" && filter.questionKey === q.key ? filter.value : undefined}
                  onPick={(v) =>
                    setFilter(filter?.type === "answer" && filter.questionKey === q.key && filter.value === v ? null : { type: "answer", questionKey: q.key, value: v })
                  }
                />
              ))}
            </div>
          </>
        )}

        {/* ── MESSAGES — 사전 질문 ─────────────────── */}
        {data.messages.length > 0 && (
          <>
            <SectionHeader
              eyebrow="VOICE"
              title="남겨주신 질문"
              sub={`${data.messages.length}분이 사전 질문을 남겨주셨어요`}
            />
            <MessagesGrid messages={data.messages} />
          </>
        )}

        {/* Footer */}
        <p className="mt-20 text-center text-[11px] text-[#d1d5db] tracking-wider">
          개인을 식별할 수 있는 정보는 표시되지 않습니다.
        </p>
      </div>
    </div>
  );
}

/* ── Section Header ───────────────────────────────────── */
function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-8">
      <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6366F1]/70 mb-2">{eyebrow}</p>
      <h2 className="text-xl sm:text-2xl font-bold text-[#111318]">{title}</h2>
      {sub && <p className="text-sm text-[#8b8f98] mt-2">{sub}</p>}
    </div>
  );
}

/* ── Frosted Card ─────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/[0.08] p-6 sm:p-7 ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Donut Chart Card (industry / skill) ──────────────── */
function DonutCard({
  title, data, total, activeValue, onPick,
}: {
  title: string;
  data: Array<{ value: string; count: number; _origValue?: string }>;
  total: number;
  activeValue?: string;
  onPick: (v: string, orig?: string) => void;
}) {
  const TOP_N = 8;
  const sorted = data.slice(0, TOP_N);
  return (
    <Card>
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#6366F1]/70 mb-5">{title}</p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="w-[180px] h-[180px] flex-shrink-0 mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sorted} dataKey="count" nameKey="value" innerRadius={56} outerRadius={84} paddingAngle={3} stroke="none">
                {sorted.map((d, i) => (
                  <Cell
                    key={d.value}
                    fill={PALETTE[i % PALETTE.length]}
                    opacity={activeValue && activeValue !== d.value ? 0.25 : 1}
                    style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                    onClick={() => onPick(d.value, d._origValue)}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "rgba(5,10,10,0.98)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: "#fff" }}
                formatter={(v: number, _name, item: any) => [`${v}명 · ${pct(v, total)}%`, item.payload.value]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          {sorted.map((d, i) => {
            const dimmed = activeValue && activeValue !== d.value;
            return (
              <button
                key={d.value}
                onClick={() => onPick(d.value, d._origValue)}
                className={`w-full flex items-center gap-3 text-left transition-all duration-200 ${dimmed ? "opacity-30" : "opacity-100"}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: PALETTE[i % PALETTE.length], boxShadow: `0 0 12px ${PALETTE[i % PALETTE.length]}80` }}
                />
                <span className="text-sm text-[#111318] leading-relaxed flex-1 break-words">{d.value}</span>
                <span className="text-[13px] font-semibold text-[#484d57] tabular-nums whitespace-nowrap flex-shrink-0">
                  {d.count}<span className="text-[#a0a4ab] ml-0.5">명</span>
                  <span className="text-[#8b8f98] ml-2">{pct(d.count, total)}%</span>
                </span>
              </button>
            );
          })}
          {data.length > TOP_N && (
            <p className="text-[11px] text-[#a0a4ab] pt-2">+ {data.length - TOP_N}개 더</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Question Card with custom HTML bars ──────────────── */
function QuestionCard({
  question, breakdown, answeredCount, isFreeText, activeValue, onPick,
}: {
  question: string;
  breakdown: Array<{ value: string; count: number }> | null;
  answeredCount: number;
  isFreeText: boolean;
  activeValue?: string;
  onPick: (v: string) => void;
}) {
  const total = answeredCount;
  const max = breakdown && breakdown.length > 0 ? breakdown[0].count : 1;
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-5">
        <h3 className="text-base sm:text-lg font-bold text-[#111318] leading-snug flex-1">
          {question}
        </h3>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold text-[#6366F1] tabular-nums">{answeredCount}<span className="text-[#8b8f98] text-xs ml-1 font-normal">명 응답</span></p>
        </div>
      </div>

      {isFreeText ? (
        <p className="text-sm text-[#8b8f98] italic">자유 입력 응답 — 텍스트 비공개, 응답 수만 집계</p>
      ) : !breakdown || breakdown.length === 0 ? (
        <p className="text-sm text-[#a0a4ab]">아직 응답이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {breakdown.map((d, i) => {
            const dimmed = activeValue && activeValue !== d.value;
            const widthPct = max > 0 ? (d.count / max) * 100 : 0;
            const sharePct = pct(d.count, total);
            const color = PALETTE[i % PALETTE.length];
            return (
              <button
                key={d.value}
                onClick={() => onPick(d.value)}
                className={`w-full text-left group transition-all duration-200 ${dimmed ? "opacity-30" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="text-[15px] sm:text-base text-[#111318] leading-relaxed flex-1 group-hover:text-[#111318]">
                    {d.value}
                  </span>
                  <span className="text-sm font-bold tabular-nums whitespace-nowrap flex-shrink-0">
                    <span style={{ color }}>{d.count}</span>
                    <span className="text-[#a0a4ab] mx-1">·</span>
                    <span className="text-[#484d57]">{sharePct}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#f7f8fa] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                      boxShadow: `0 0 16px ${color}40`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ── Messages Grid ────────────────────────────────────── */
function MessagesGrid({ messages }: { messages: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 6;
  const list = expanded ? messages : messages.slice(0, VISIBLE);
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((m, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.08] p-5 relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(16px)",
            }}
          >
            <Quote className="h-4 w-4 text-[#6366F1]/40 mb-2" />
            <p className="text-[14px] text-[#111318] leading-relaxed whitespace-pre-wrap break-words">
              {m}
            </p>
          </div>
        ))}
      </div>
      {messages.length > VISIBLE && (
        <div className="text-center mt-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-[#6366F1] hover:text-[#FFD89B] tracking-wider uppercase transition-colors"
          >
            {expanded ? "접기" : `+ ${messages.length - VISIBLE}개 더 보기`}
          </button>
        </div>
      )}
    </div>
  );
}
