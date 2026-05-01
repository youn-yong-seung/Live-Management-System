import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit3, ChevronDown, ChevronRight, RotateCcw, Save, GitBranch } from "lucide-react";

/* ── Types (mirror server) ───────────────────────────── */

interface TreeNode {
  id: string;
  liveId: number;
  title: string;
  shortTitle: string;
  description: string;
  youtubeUrl: string;
  tags: string[];
  level: string;
  gains: string[];
  children?: string[];
  tool?: string;
}

interface TreePath {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  glowColor: string;
  nodes: TreeNode[];
}

/* ── API helper ──────────────────────────────────────── */

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

/* ── Utils ───────────────────────────────────────────── */

function emptyNode(idx: number): TreeNode {
  return {
    id: `n${Date.now()}_${idx}`,
    liveId: 0,
    level: "Lv.1 ",
    title: "",
    shortTitle: "",
    description: "",
    youtubeUrl: "",
    tags: [],
    gains: [],
    children: [],
  };
}

function emptyPath(idx: number): TreePath {
  return {
    id: `path${Date.now()}_${idx}`,
    name: "새 테크트리",
    emoji: "🆕",
    description: "",
    color: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.3)",
    nodes: [],
  };
}

/* ── Main component ──────────────────────────────────── */

export function AdminTechTreeEditor() {
  const { toast } = useToast();
  const [paths, setPaths] = useState<TreePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<{ pathId: string; node: TreeNode; isNew: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ paths: TreePath[] }>("/tech-tree");
        setPaths(data.paths);
      } catch (e) {
        toast({ variant: "destructive", title: (e as Error).message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/tech-tree", { method: "PUT", body: JSON.stringify({ paths }) });
      toast({ title: "저장 완료!" });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm("기본값으로 되돌립니다. 현재 변경사항은 사라져요. 계속할까요?")) return;
    setSaving(true);
    try {
      const data = await apiFetch<{ paths: TreePath[] }>("/tech-tree/reset", { method: "POST" });
      setPaths(data.paths);
      toast({ title: "기본값 복원 완료" });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const updatePath = (id: string, patch: Partial<TreePath>) => {
    setPaths((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePath = (id: string) => {
    if (!confirm("이 테크트리를 삭제할까요?")) return;
    setPaths((prev) => prev.filter((p) => p.id !== id));
  };

  const addPath = () => {
    setPaths((prev) => [...prev, emptyPath(prev.length)]);
  };

  const movePath = (id: string, dir: -1 | 1) => {
    setPaths((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const upsertNode = (pathId: string, node: TreeNode, isNew: boolean) => {
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p;
        if (isNew) return { ...p, nodes: [...p.nodes, node] };
        return { ...p, nodes: p.nodes.map((n) => (n.id === node.id ? node : n)) };
      })
    );
  };

  const removeNode = (pathId: string, nodeId: string) => {
    if (!confirm(`노드 "${nodeId}"를 삭제할까요? 이 노드를 children으로 참조하는 다른 노드도 자동 정리됩니다.`)) return;
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p;
        return {
          ...p,
          nodes: p.nodes
            .filter((n) => n.id !== nodeId)
            .map((n) => ({ ...n, children: (n.children ?? []).filter((c) => c !== nodeId) })),
        };
      })
    );
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-500" />
            테크트리 편집
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            패스(트리)와 노드(영상)를 자유롭게 추가/수정. 저장하면 즉시 공개 페이지에 반영됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={reset} disabled={saving}>
            <RotateCcw className="h-3.5 w-3.5" />
            기본값으로
          </Button>
          <Button size="sm" className="rounded-lg text-xs gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            저장
          </Button>
        </div>
      </div>

      {/* Path cards */}
      <div className="space-y-3">
        {paths.map((path, pi) => {
          const isOpen = expanded === path.id;
          return (
            <div key={path.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Path header */}
              <div className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isOpen ? null : path.id)}>
                {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                <span className="text-2xl">{path.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{path.name}</p>
                  <p className="text-xs text-gray-500">{path.description} · {path.nodes.length}개 노드</p>
                </div>
                <span className="w-3 h-3 rounded-full" style={{ background: path.color }} />
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" disabled={pi === 0} onClick={() => movePath(path.id, -1)}>↑</Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" disabled={pi === paths.length - 1} onClick={() => movePath(path.id, 1)}>↓</Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-500" onClick={() => removePath(path.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="p-5 border-t border-gray-100 space-y-5 bg-gray-50/30">
                  {/* Path metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500">ID (slug)</Label>
                      <Input className="h-8 text-xs mt-1 font-mono" value={path.id} onChange={(e) => updatePath(path.id, { id: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500">이름</Label>
                      <Input className="h-8 text-xs mt-1" value={path.name} onChange={(e) => updatePath(path.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500">이모지</Label>
                      <Input className="h-8 text-sm mt-1 text-center" value={path.emoji} onChange={(e) => updatePath(path.id, { emoji: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500">색상</Label>
                      <div className="flex gap-1 mt-1">
                        <input type="color" value={path.color} onChange={(e) => {
                          const c = e.target.value;
                          // 컬러 변경 시 glowColor도 자동 동기화
                          const r = parseInt(c.slice(1, 3), 16);
                          const g = parseInt(c.slice(3, 5), 16);
                          const b = parseInt(c.slice(5, 7), 16);
                          updatePath(path.id, { color: c, glowColor: `rgba(${r}, ${g}, ${b}, 0.3)` });
                        }} className="h-8 w-8 rounded border border-gray-200 cursor-pointer" />
                        <Input className="h-8 text-xs flex-1 font-mono" value={path.color} onChange={(e) => updatePath(path.id, { color: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500">설명</Label>
                      <Input className="h-8 text-xs mt-1" value={path.description} onChange={(e) => updatePath(path.id, { description: e.target.value })} />
                    </div>
                  </div>

                  {/* Node list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500">노드 ({path.nodes.length}개)</Label>
                      <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs gap-1" onClick={() => setEditingNode({ pathId: path.id, node: emptyNode(path.nodes.length), isNew: true })}>
                        <Plus className="h-3 w-3" /> 노드 추가
                      </Button>
                    </div>
                    {path.nodes.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6 bg-white rounded-lg border border-dashed border-gray-200">아직 노드가 없습니다.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {path.nodes.map((node) => (
                          <NodeRow
                            key={node.id}
                            node={node}
                            allNodes={path.nodes}
                            color={path.color}
                            onEdit={() => setEditingNode({ pathId: path.id, node, isNew: false })}
                            onDelete={() => removeNode(path.id, node.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add path */}
        <button
          onClick={addPath}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> 테크트리 추가
        </button>
      </div>

      {/* Node edit modal */}
      {editingNode && (
        <NodeEditModal
          editingNode={editingNode}
          allNodesInPath={paths.find((p) => p.id === editingNode.pathId)?.nodes ?? []}
          onClose={() => setEditingNode(null)}
          onSave={(node) => {
            upsertNode(editingNode.pathId, node, editingNode.isNew);
            setEditingNode(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Node row (compact preview) ──────────────────────── */

function NodeRow({ node, allNodes, color, onEdit, onDelete }: {
  node: TreeNode;
  allNodes: TreeNode[];
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const childTitles = (node.children ?? [])
    .map((cid) => allNodes.find((n) => n.id === cid)?.shortTitle ?? cid)
    .join(" · ");
  return (
    <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-100 hover:border-gray-200 group">
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ background: `${color}15`, color }}>
        {node.id}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800 truncate">{node.shortTitle || "(제목 없음)"}</span>
          {node.tool && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{node.tool}</span>}
          <span className="text-[10px] text-gray-400">{node.level}</span>
          <span className="text-[10px] text-gray-400">live #{node.liveId}</span>
        </div>
        {childTitles && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">→ {childTitles}</p>
        )}
      </div>
      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={onEdit}>
        <Edit3 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-500" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ── Node edit modal ─────────────────────────────────── */

function NodeEditModal({
  editingNode, allNodesInPath, onClose, onSave,
}: {
  editingNode: { pathId: string; node: TreeNode; isNew: boolean };
  allNodesInPath: TreeNode[];
  onClose: () => void;
  onSave: (n: TreeNode) => void;
}) {
  const [n, setN] = useState<TreeNode>(editingNode.node);

  const update = (patch: Partial<TreeNode>) => setN((prev) => ({ ...prev, ...patch }));

  const tagsStr = (n.tags ?? []).join(", ");
  const gainsStr = (n.gains ?? []).join("\n");

  // children 옵션은 자기 자신 제외한 같은 path의 노드들
  const childCandidates = allNodesInPath.filter((x) => x.id !== editingNode.node.id);
  const selectedChildren = new Set(n.children ?? []);

  const toggleChild = (cid: string) => {
    const next = new Set(selectedChildren);
    if (next.has(cid)) next.delete(cid);
    else next.add(cid);
    update({ children: Array.from(next) });
  };

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="!max-w-[720px] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {editingNode.isNew ? "노드 추가" : `노드 편집 — ${n.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
          {/* IDs & basics */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="노드 ID (영문, 영구 고유)">
              <Input className="h-8 text-xs font-mono" value={n.id} onChange={(e) => update({ id: e.target.value })} />
            </Field>
            <Field label="라이브 ID (DB의 라이브 번호)">
              <Input className="h-8 text-xs" type="number" value={n.liveId} onChange={(e) => update({ liveId: parseInt(e.target.value || "0", 10) })} />
            </Field>
          </div>

          {/* Titles */}
          <Field label="제목 (모달/툴팁 표시)">
            <Input className="h-8 text-sm" value={n.title} onChange={(e) => update({ title: e.target.value })} />
          </Field>
          <Field label="짧은 제목 (노드 아래 표시)">
            <Input className="h-8 text-sm" value={n.shortTitle} onChange={(e) => update({ shortTitle: e.target.value })} />
          </Field>

          {/* Level / Tool */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="레벨 (예: Lv.1 입문)">
              <Input className="h-8 text-xs" value={n.level} onChange={(e) => update({ level: e.target.value })} />
            </Field>
            <Field label="툴 라벨 (분기 진입 노드에만 — 예: 커서, 클로드코드)">
              <Input className="h-8 text-xs" value={n.tool ?? ""} onChange={(e) => update({ tool: e.target.value || undefined })} />
            </Field>
          </div>

          {/* URL / desc */}
          <Field label="YouTube URL (비우면 시청 버튼 숨김)">
            <Input className="h-8 text-xs font-mono" value={n.youtubeUrl} onChange={(e) => update({ youtubeUrl: e.target.value })} />
          </Field>
          <Field label="설명 (모달에 표시)">
            <textarea className="w-full text-xs border rounded-lg p-2 resize-none min-h-[60px]" value={n.description} onChange={(e) => update({ description: e.target.value })} />
          </Field>

          {/* Tags / Gains */}
          <Field label="태그 (쉼표로 구분)">
            <Input className="h-8 text-xs" value={tagsStr} onChange={(e) => update({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
          <Field label="습득 스킬 (한 줄에 하나씩)">
            <textarea className="w-full text-xs border rounded-lg p-2 resize-none min-h-[80px]" value={gainsStr} onChange={(e) => update({ gains: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
          </Field>

          {/* Children selector */}
          <Field label={`자식 노드 (다음 단계로 이어질 노드 선택, ${selectedChildren.size}개)`}>
            {childCandidates.length === 0 ? (
              <p className="text-xs text-gray-400">이 패스에 다른 노드가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                {childCandidates.map((c) => {
                  const checked = selectedChildren.has(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleChild(c.id)} className="rounded" />
                      <span className="font-mono text-gray-500 w-12 truncate">{c.id}</span>
                      <span className="text-gray-700 truncate">{c.shortTitle || "(제목 없음)"}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
        </div>

        <DialogFooter className="flex-none border-t border-gray-100 pt-3 mt-2">
          <Button variant="outline" className="rounded-xl text-sm" onClick={onClose}>취소</Button>
          <Button className="rounded-xl text-sm bg-blue-600 hover:bg-blue-700" onClick={() => onSave(n)}>
            {editingNode.isNew ? "추가" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
