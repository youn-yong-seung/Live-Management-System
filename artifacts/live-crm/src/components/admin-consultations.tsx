import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Heart,
  RefreshCw,
  AlertCircle,
  Settings,
  FileEdit,
} from "lucide-react";

const tabs = ["posts", "form"] as const;
type Tab = (typeof tabs)[number];

const STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "featured", label: "라이브 픽업" },
  { value: "answered", label: "답변 완료" },
  { value: "hidden", label: "숨김" },
] as const;

interface Consultation {
  id: number;
  authorId: string | null;
  name: string;
  ageRange: string;
  phone: string;
  industry: string;
  industryCustom: string | null;
  jobType: string;
  jobTypeCustom: string | null;
  currentWork: string;
  concern: string;
  hardest: string;
  liveRequested: boolean;
  liveId: number | null;
  likeCount: number;
  viewCount: number;
  status: string;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  seeds: number;
  real: number;
  hidden: number;
  seedsVisible: boolean;
}

interface FormConfig {
  board: { badge: string; title: string; description: string };
  form: {
    badge: string;
    title: string;
    description: string;
    fields: {
      currentWork: { label: string; hint: string; placeholder: string };
      concern: { label: string; hint: string; placeholder: string };
      hardest: { label: string; hint: string; placeholder: string };
    };
    submitLabel: string;
    liveCheckboxLabel: string;
    liveCheckboxDescription: string;
  };
  thankYou: { title: string; body: string };
}

function authHeaders(): Record<string, string> {
  const token = (() => {
    try {
      return sessionStorage.getItem("crm_admin_token") ?? "";
    } catch {
      return "";
    }
  })();
  return token ? { "x-admin-token": token } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
}

export function AdminConsultations() {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm font-semibold">
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 ${
            tab === "posts"
              ? "bg-[#111318] text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <FileEdit className="h-4 w-4" /> 글 관리
        </button>
        <button
          onClick={() => setTab("form")}
          className={`px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 ${
            tab === "form"
              ? "bg-[#111318] text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Settings className="h-4 w-4" /> 게시판/폼 설정
        </button>
      </div>

      {tab === "posts" && <PostsManager />}
      {tab === "form" && <FormConfigEditor />}
    </div>
  );
}

/* ════════════════════════════════════════════════════
 * 글 관리 탭
 * ════════════════════════════════════════════════════ */
function PostsManager() {
  const [items, setItems] = useState<Consultation[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"all" | "seeds" | "real">("all");
  const [order, setOrder] = useState<"recent" | "popular">("recent");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setItems(null);
    setError(null);
    try {
      const d = await apiFetch<{ consultations: Consultation[]; stats: Stats }>(
        `/admin/consultations?filter=${filter}&order=${order}`,
      );
      setItems(d.consultations);
      setStats(d.stats);
    } catch (e: any) {
      setError(e?.message ?? "불러오기 실패");
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, [filter, order]);

  const toggleSeedsVisibility = async () => {
    if (!stats || busy) return;
    setBusy(true);
    try {
      await apiFetch("/admin/consultations/seeds-visible", {
        method: "POST",
        body: JSON.stringify({ visible: !stats.seedsVisible }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "토글 실패");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`사연 #${id}를 영구 삭제할까요?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/consultations/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const handlePatch = async (id: number, patch: Partial<Consultation>) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/consultations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "수정 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 통계 + 시드 토글 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            전체 <span className="font-bold text-gray-900">{stats?.total ?? "—"}</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            예시 <span className="font-bold text-amber-600">{stats?.seeds ?? "—"}</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            실제 <span className="font-bold text-indigo-600">{stats?.real ?? "—"}</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            숨김 <span className="font-bold text-gray-700">{stats?.hidden ?? "—"}</span>
          </span>
        </div>
        <button
          onClick={toggleSeedsVisibility}
          disabled={busy || !stats}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
            stats?.seedsVisible
              ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
              : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
          }`}
          title="예시(시드) 사연을 일괄 노출/숨김"
        >
          {stats?.seedsVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          예시 사연 {stats?.seedsVisible ? "노출 중" : "숨김 중"}
          <span className="text-xs text-gray-500">(클릭해서 전환)</span>
        </button>
      </div>

      {/* 필터/정렬 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(
            [
              { v: "all", label: "전체" },
              { v: "real", label: "실제 글" },
              { v: "seeds", label: "예시(시드)" },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === f.v
                  ? "bg-[#111318] text-white border-[#111318]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOrder("recent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              order === "recent"
                ? "bg-[#111318] text-white border-[#111318]"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setOrder("popular")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              order === "popular"
                ? "bg-[#111318] text-white border-[#111318]"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            인기순
          </button>
          <button
            onClick={load}
            className="px-2 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="새로고침"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* 목록 */}
      {items === null && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="h-4 w-2/3 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-1/4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
          해당 조건의 사연이 없습니다.
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div className="space-y-2">
          {items.map((c) =>
            editingId === c.id ? (
              <EditCard
                key={c.id}
                consultation={c}
                onCancel={() => setEditingId(null)}
                onSave={async (patch) => {
                  await handlePatch(c.id, patch);
                  setEditingId(null);
                }}
                busy={busy}
              />
            ) : (
              <RowCard
                key={c.id}
                consultation={c}
                onEdit={() => setEditingId(c.id)}
                onDelete={() => handleDelete(c.id)}
                onToggleSeed={() => handlePatch(c.id, { isSeed: !c.isSeed })}
                onStatusChange={(s) =>
                  handlePatch(c.id, { status: s as Consultation["status"] })
                }
                busy={busy}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function RowCard({
  consultation: c,
  onEdit,
  onDelete,
  onToggleSeed,
  onStatusChange,
  busy,
}: {
  consultation: Consultation;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSeed: () => void;
  onStatusChange: (s: string) => void;
  busy: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono text-gray-400">#{c.id}</span>
          {c.isSeed && (
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> 예시
            </span>
          )}
          {c.status === "hidden" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
              숨김
            </span>
          )}
          <span className="text-sm font-bold text-gray-900">{c.name}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{c.ageRange}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{c.industry}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{c.jobType}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-0.5">
            <Heart className="h-3 w-3" /> {c.likeCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Eye className="h-3 w-3" /> {c.viewCount}
          </span>
          <span>{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-gray-900 font-semibold line-clamp-1">{c.concern}</p>
        <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-line">{c.currentWork}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">상태</span>
          <select
            value={c.status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={busy}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={onToggleSeed}
            disabled={busy}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
              c.isSeed
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
            title={c.isSeed ? "예시(시드) 글 — 해제" : "이 글을 예시(시드)로 표시"}
          >
            {c.isSeed ? "예시 ✓" : "예시로 표시"}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            수정
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> 삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCard({
  consultation,
  onCancel,
  onSave,
  busy,
}: {
  consultation: Consultation;
  onCancel: () => void;
  onSave: (patch: Partial<Consultation>) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState(consultation.name);
  const [currentWork, setCurrentWork] = useState(consultation.currentWork);
  const [concern, setConcern] = useState(consultation.concern);
  const [hardest, setHardest] = useState(consultation.hardest);

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:border-indigo-400";

  return (
    <div className="bg-indigo-50/50 border-2 border-indigo-200 rounded-xl p-4 space-y-3">
      <div className="text-xs font-bold text-indigo-700">
        ✏️ 사연 #{consultation.id} 수정
      </div>
      <FieldRow label="이름">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </FieldRow>
      <FieldRow label="어떤 일을 하시나요?">
        <textarea
          value={currentWork}
          onChange={(e) => setCurrentWork(e.target.value)}
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </FieldRow>
      <FieldRow label="어떤 고민이 있으신가요?">
        <textarea
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          rows={5}
          className={`${inputCls} resize-none`}
        />
      </FieldRow>
      <FieldRow label="가장 힘든 게 무엇인가요?">
        <textarea
          value={hardest}
          onChange={(e) => setHardest(e.target.value)}
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600"
        >
          취소
        </button>
        <button
          onClick={() => onSave({ name, currentWork, concern, hardest })}
          disabled={busy}
          className="text-xs font-bold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          저장
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════
 * 폼/게시판 설정 탭
 * ════════════════════════════════════════════════════ */
function FormConfigEditor() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [original, setOriginal] = useState<FormConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setError(null);
    try {
      const d = await apiFetch<{ config: FormConfig }>(
        "/community/consultations/meta/form-config",
      );
      setConfig(d.config);
      setOriginal(JSON.parse(JSON.stringify(d.config)));
    } catch (e: any) {
      setError(e?.message ?? "불러오기 실패");
    }
  };

  const save = async () => {
    if (!config || busy) return;
    setBusy(true);
    setError(null);
    try {
      const d = await apiFetch<{ config: FormConfig }>(
        "/admin/consultations/form-config",
        {
          method: "PATCH",
          body: JSON.stringify({ config }),
        },
      );
      setConfig(d.config);
      setOriginal(JSON.parse(JSON.stringify(d.config)));
      setSavedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const dirty = useMemo(() => {
    if (!config || !original) return false;
    return JSON.stringify(config) !== JSON.stringify(original);
  }, [config, original]);

  if (!config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:border-indigo-400";

  return (
    <div className="space-y-5">
      {/* 저장 바 */}
      <div className="sticky top-16 z-20 bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="text-sm text-gray-600">
          {dirty ? (
            <span className="text-amber-600 font-semibold">● 저장하지 않은 변경사항</span>
          ) : savedAt ? (
            <span className="text-emerald-600 font-semibold">
              ✓ 저장됨 ({savedAt.toLocaleTimeString("ko-KR")})
            </span>
          ) : (
            <span className="text-gray-400">변경사항 없음</span>
          )}
        </div>
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* 게시판 히어로 */}
      <Section title="게시판 히어로 (목록 페이지 상단)">
        <FieldRow label="배지 텍스트">
          <input
            value={config.board.badge}
            onChange={(e) =>
              setConfig({ ...config, board: { ...config.board, badge: e.target.value } })
            }
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="메인 제목">
          <textarea
            value={config.board.title}
            onChange={(e) =>
              setConfig({ ...config, board: { ...config.board, title: e.target.value } })
            }
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </FieldRow>
        <FieldRow label="설명">
          <textarea
            value={config.board.description}
            onChange={(e) =>
              setConfig({ ...config, board: { ...config.board, description: e.target.value } })
            }
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </FieldRow>
      </Section>

      {/* 폼 헤더 */}
      <Section title="폼 페이지 헤더 (사연 신청 페이지 상단)">
        <FieldRow label="배지 텍스트">
          <input
            value={config.form.badge}
            onChange={(e) =>
              setConfig({ ...config, form: { ...config.form, badge: e.target.value } })
            }
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="제목">
          <input
            value={config.form.title}
            onChange={(e) =>
              setConfig({ ...config, form: { ...config.form, title: e.target.value } })
            }
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="설명">
          <textarea
            value={config.form.description}
            onChange={(e) =>
              setConfig({
                ...config,
                form: { ...config.form, description: e.target.value },
              })
            }
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </FieldRow>
      </Section>

      {/* 3개 질문 필드 */}
      {(
        [
          { key: "currentWork", title: "Q1. 어떤 일을 하시나요?" },
          { key: "concern", title: "Q2. 어떤 고민이 있으신가요?" },
          { key: "hardest", title: "Q3. 가장 힘든 게 무엇인가요?" },
        ] as const
      ).map(({ key, title }) => (
        <Section key={key} title={title}>
          <FieldRow label="질문 라벨">
            <input
              value={config.form.fields[key].label}
              onChange={(e) =>
                setConfig({
                  ...config,
                  form: {
                    ...config.form,
                    fields: {
                      ...config.form.fields,
                      [key]: { ...config.form.fields[key], label: e.target.value },
                    },
                  },
                })
              }
              className={inputCls}
            />
          </FieldRow>
          <FieldRow label="힌트 (라벨 아래 작은 안내)">
            <textarea
              value={config.form.fields[key].hint}
              onChange={(e) =>
                setConfig({
                  ...config,
                  form: {
                    ...config.form,
                    fields: {
                      ...config.form.fields,
                      [key]: { ...config.form.fields[key], hint: e.target.value },
                    },
                  },
                })
              }
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </FieldRow>
          <FieldRow label="플레이스홀더 (빈 입력란 안내 텍스트)">
            <textarea
              value={config.form.fields[key].placeholder}
              onChange={(e) =>
                setConfig({
                  ...config,
                  form: {
                    ...config.form,
                    fields: {
                      ...config.form.fields,
                      [key]: { ...config.form.fields[key], placeholder: e.target.value },
                    },
                  },
                })
              }
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </FieldRow>
        </Section>
      ))}

      {/* 라이브 체크박스 + 제출 버튼 */}
      <Section title="라이브 신청 체크박스 / 제출 버튼">
        <FieldRow label="제출 버튼 라벨">
          <input
            value={config.form.submitLabel}
            onChange={(e) =>
              setConfig({
                ...config,
                form: { ...config.form, submitLabel: e.target.value },
              })
            }
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="라이브 체크박스 라벨">
          <input
            value={config.form.liveCheckboxLabel}
            onChange={(e) =>
              setConfig({
                ...config,
                form: { ...config.form, liveCheckboxLabel: e.target.value },
              })
            }
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="체크박스 보조 설명">
          <textarea
            value={config.form.liveCheckboxDescription}
            onChange={(e) =>
              setConfig({
                ...config,
                form: { ...config.form, liveCheckboxDescription: e.target.value },
              })
            }
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </FieldRow>
      </Section>

      {/* 제출 후 화면 */}
      <Section title="제출 완료 화면">
        <FieldRow label="제목">
          <input
            value={config.thankYou.title}
            onChange={(e) =>
              setConfig({
                ...config,
                thankYou: { ...config.thankYou, title: e.target.value },
              })
            }
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="본문">
          <textarea
            value={config.thankYou.body}
            onChange={(e) =>
              setConfig({
                ...config,
                thankYou: { ...config.thankYou, body: e.target.value },
              })
            }
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </FieldRow>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
