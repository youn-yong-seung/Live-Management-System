import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Upload, ExternalLink, Download, Link as LinkIcon, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface ResourceRow {
  id: number;
  title: string;
  description: string | null;
  category: string;
  iconName: string | null;
  badge: string | null;
  badgeColor: string | null;
  externalUrl: string | null;
  filePath: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  internalRoute: string | null;
  displayOrder: number;
  isPublished: boolean;
  downloadCount: number;
  createdAt: string;
}

interface FormState {
  id?: number;
  title: string;
  description: string;
  category: string;
  iconName: string;
  badge: string;
  badgeColor: string;
  externalUrl: string;
  filePath: string;
  fileMimeType: string;
  fileSize: number;
  internalRoute: string;
  displayOrder: number;
  isPublished: boolean;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  category: "",
  iconName: "FileText",
  badge: "",
  badgeColor: "bg-[#6366F1]",
  externalUrl: "",
  filePath: "",
  fileMimeType: "",
  fileSize: 0,
  internalRoute: "",
  displayOrder: 0,
  isPublished: true,
};

const KNOWN_CATEGORIES = [
  "자동화 프로그램",
  "노션 템플릿",
  "노션 강의 & 가이드",
  "무료 전자책 & PDF 가이드",
];

const BADGE_COLOR_OPTIONS = [
  { value: "bg-emerald-500", label: "초록 (무료)" },
  { value: "bg-sky-500", label: "하늘 (무료체험)" },
  { value: "bg-blue-500", label: "파랑 (인기)" },
  { value: "bg-indigo-500", label: "남색 (강의)" },
  { value: "bg-amber-500", label: "주황 (가이드)" },
  { value: "bg-rose-500", label: "빨강 (NEW)" },
  { value: "bg-[#6366F1]", label: "골드 (PRO)" },
];

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminResources() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<ResourceRow[] | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/login");
  }, [loading, user, navigate]);

  const reload = async () => {
    const h = await authHeaders();
    const res = await fetch("/api/resources/admin/all", { headers: h });
    if (!res.ok) {
      setRows([]);
      return;
    }
    const { resources } = await res.json();
    setRows(resources ?? []);
  };

  useEffect(() => {
    if (user?.role === "admin") reload();
  }, [user?.role]);

  const openCreate = () => {
    setEditing({ ...emptyForm });
    setErrorMsg(null);
  };

  const openEdit = (r: ResourceRow) => {
    setEditing({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      category: r.category,
      iconName: r.iconName ?? "FileText",
      badge: r.badge ?? "",
      badgeColor: r.badgeColor ?? "bg-[#6366F1]",
      externalUrl: r.externalUrl ?? "",
      filePath: r.filePath ?? "",
      fileMimeType: r.fileMimeType ?? "",
      fileSize: r.fileSize ?? 0,
      internalRoute: r.internalRoute ?? "",
      displayOrder: r.displayOrder,
      isPublished: r.isPublished,
    });
    setErrorMsg(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (editing.title.trim().length < 1) {
      setErrorMsg("제목을 입력하세요.");
      return;
    }
    if (editing.category.trim().length < 1) {
      setErrorMsg("카테고리를 선택하거나 입력하세요.");
      return;
    }
    if (!editing.externalUrl && !editing.filePath && !editing.internalRoute) {
      setErrorMsg("외부 URL / 업로드 파일 / 내부 라우트 중 하나는 있어야 합니다.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    const body = JSON.stringify({
      title: editing.title,
      description: editing.description || null,
      category: editing.category,
      iconName: editing.iconName || null,
      badge: editing.badge || null,
      badgeColor: editing.badgeColor || null,
      externalUrl: editing.externalUrl || null,
      filePath: editing.filePath || null,
      fileMimeType: editing.fileMimeType || null,
      fileSize: editing.fileSize || null,
      internalRoute: editing.internalRoute || null,
      displayOrder: editing.displayOrder,
      isPublished: editing.isPublished,
    });

    const url = editing.id ? `/api/resources/${editing.id}` : "/api/resources";
    const method = editing.id ? "PUT" : "POST";
    const res = await fetch(url, { method, headers, body });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErrorMsg(d?.error ?? "저장 실패");
      return;
    }
    closeEdit();
    reload();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제할까요? 업로드된 파일도 함께 삭제됩니다.")) return;
    const headers = await authHeaders();
    const res = await fetch(`/api/resources/${id}`, { method: "DELETE", headers });
    if (!res.ok) {
      alert("삭제 실패");
      return;
    }
    reload();
  };

  const handleUpload = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const headers = await authHeaders();
    const res = await fetch("/api/resources/upload", { method: "POST", headers, body: fd });
    setUploading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErrorMsg(d?.error ?? "업로드 실패");
      return;
    }
    const data = (await res.json()) as { filePath: string; fileMimeType: string; fileSize: number };
    setEditing({
      ...editing,
      filePath: data.filePath,
      fileMimeType: data.fileMimeType,
      fileSize: data.fileSize,
    });
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-[#8b8f98] animate-spin" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-[#8b8f98]">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link href="/admin">
        <span className="inline-flex items-center gap-1.5 text-sm text-[#8b8f98] hover:text-[#6366F1] transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> 관리자 홈
        </span>
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111318] mb-1">자료실 관리</h1>
          <p className="text-[#8b8f98] text-sm">/resources 페이지에 노출되는 자료를 관리합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 bg-[#6366F1] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#818CF8] transition-all gold-glow"
        >
          <Plus className="h-4 w-4" /> 자료 추가
        </button>
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-[#8b8f98] animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[#8b8f98]">등록된 자료가 없습니다.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f7f8fa] border-b border-[#e5e7eb]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#484d57]">카테고리</th>
                <th className="text-left px-4 py-3 font-semibold text-[#484d57]">제목</th>
                <th className="text-left px-4 py-3 font-semibold text-[#484d57]">타입</th>
                <th className="text-left px-4 py-3 font-semibold text-[#484d57]">뱃지</th>
                <th className="text-center px-3 py-3 font-semibold text-[#484d57]">순서</th>
                <th className="text-center px-3 py-3 font-semibold text-[#484d57]">노출</th>
                <th className="text-center px-3 py-3 font-semibold text-[#484d57]">DL</th>
                <th className="text-right px-4 py-3 font-semibold text-[#484d57]">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#eef0f3] hover:bg-[#f7f8fa] transition-colors">
                  <td className="px-4 py-3 text-[#8b8f98] text-xs">{r.category}</td>
                  <td className="px-4 py-3 text-[#111318] font-medium">{r.title}</td>
                  <td className="px-4 py-3">
                    {r.filePath ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <Download className="h-3 w-3" /> 파일
                      </span>
                    ) : r.internalRoute ? (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        <LinkIcon className="h-3 w-3" /> 내부
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                        <ExternalLink className="h-3 w-3" /> 외부
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.badge && (
                      <span className={`${r.badgeColor ?? "bg-gray-500"} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                        {r.badge}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-[#8b8f98]">{r.displayOrder}</td>
                  <td className="px-3 py-3 text-center">
                    {r.isPublished ? (
                      <span className="text-emerald-600 text-xs font-semibold">●</span>
                    ) : (
                      <span className="text-[#a0a4ab] text-xs">○</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-[#8b8f98] text-xs">{r.downloadCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="text-[#484d57] hover:text-[#6366F1] mr-3" aria-label="수정">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-rose-600 hover:text-rose-700" aria-label="삭제">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#111318]">{editing.id ? "자료 수정" : "자료 추가"}</h2>
              <button onClick={closeEdit} aria-label="닫기" className="text-[#8b8f98] hover:text-[#111318]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#484d57] mb-1.5">제목 *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                  placeholder="자료 제목"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#484d57] mb-1.5">설명</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318] resize-none"
                  placeholder="간단한 설명"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#484d57] mb-1.5">카테고리 *</label>
                  <input
                    type="text"
                    list="categories"
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                    placeholder="자동화 프로그램"
                  />
                  <datalist id="categories">
                    {KNOWN_CATEGORIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#484d57] mb-1.5">아이콘 (lucide-react)</label>
                  <input
                    type="text"
                    value={editing.iconName}
                    onChange={(e) => setEditing({ ...editing, iconName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                    placeholder="FileText, Zap, BookOpen ..."
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#484d57] mb-1.5">뱃지 텍스트</label>
                  <input
                    type="text"
                    value={editing.badge}
                    onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                    placeholder="무료, PRO, NEW ..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#484d57] mb-1.5">뱃지 색상</label>
                  <select
                    value={editing.badgeColor}
                    onChange={(e) => setEditing({ ...editing, badgeColor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318] bg-white"
                  >
                    {BADGE_COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
                <div className="text-xs font-semibold text-[#484d57]">다음 셋 중 하나만 입력 (우선순위: 내부 라우트 &gt; 파일 &gt; 외부 URL)</div>
                <div>
                  <label className="block text-xs text-[#8b8f98] mb-1">외부 URL</label>
                  <input
                    type="url"
                    value={editing.externalUrl}
                    onChange={(e) => setEditing({ ...editing, externalUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8b8f98] mb-1">내부 라우트</label>
                  <input
                    type="text"
                    value={editing.internalRoute}
                    onChange={(e) => setEditing({ ...editing, internalRoute: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                    placeholder="/resources/some-page"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8b8f98] mb-1">파일 업로드</label>
                  {editing.filePath ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex-1 truncate">
                        {editing.filePath} ({(editing.fileSize / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        onClick={() => setEditing({ ...editing, filePath: "", fileMimeType: "", fileSize: 0 })}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        제거
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[#d1d5db] hover:border-[#6366F1] hover:bg-[#f7f8fa] cursor-pointer transition-colors">
                      <Upload className="h-4 w-4 text-[#8b8f98]" />
                      <span className="text-xs text-[#484d57]">{uploading ? "업로드 중..." : "파일 선택"}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#484d57] mb-1.5">정렬 순서</label>
                  <input
                    type="number"
                    value={editing.displayOrder}
                    onChange={(e) => setEditing({ ...editing, displayOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:border-[#6366F1] text-sm text-[#111318]"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.isPublished}
                      onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded border-[#e5e7eb]"
                    />
                    <span className="text-sm text-[#484d57]">/resources에 노출</span>
                  </label>
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-rose-600" role="alert">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#eef0f3]">
                <button onClick={closeEdit} className="px-5 py-2.5 rounded-xl border border-[#e5e7eb] text-sm font-medium text-[#484d57] hover:bg-[#f7f8fa]">
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#6366F1] text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-[#818CF8] disabled:opacity-50 gold-glow"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
