import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Trash2, Edit3, ChevronDown, ChevronRight, RotateCcw, Save,
  GitBranch, Search, X, Link2, Check, Settings,
} from "lucide-react";

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

interface Live {
  id: number;
  title: string;
  description: string | null;
  youtubeUrl: string | null;
  scheduledAt: string | null;
  status: string;
  thumbnailUrl: string | null;
  tags?: string[] | null;
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

function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/|\/shorts\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

function thumbForLive(live: Live | undefined): string | null {
  if (!live) return null;
  if (live.thumbnailUrl) return live.thumbnailUrl;
  const yt = extractYoutubeId(live.youtubeUrl);
  if (yt) return `https://img.youtube.com/vi/${yt}/mqdefault.jpg`;
  return null;
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

function nodeFromLive(live: Live, parent: TreeNode | null, allIds: Set<string>): TreeNode {
  // 자동 채움: 라이브 정보 활용
  const parentLevelMatch = parent?.level.match(/Lv\.(\d+)/);
  const nextLv = parentLevelMatch ? parseInt(parentLevelMatch[1], 10) + 1 : 1;
  // 고유 id 보장
  let id = `n${live.id}`;
  let suffix = 0;
  while (allIds.has(id)) {
    suffix += 1;
    id = `n${live.id}_${suffix}`;
  }
  const safeTitle = live.title || "(제목 없음)";
  return {
    id,
    liveId: live.id,
    level: `Lv.${nextLv}`,
    title: safeTitle,
    shortTitle: safeTitle.length > 14 ? safeTitle.slice(0, 14) + "…" : safeTitle,
    description: live.description || safeTitle,
    youtubeUrl: live.youtubeUrl || "",
    tags: Array.isArray(live.tags) ? live.tags : [],
    gains: [],
    children: [],
  };
}

/** BFS 레벨 계산. children에 의해 참조되지 않는 노드를 root로. */
function computeLevels(nodes: TreeNode[]): TreeNode[][] {
  if (nodes.length === 0) return [];
  const referenced = new Set<string>();
  for (const n of nodes) for (const c of n.children ?? []) referenced.add(c);
  const roots = nodes.filter((n) => !referenced.has(n.id));
  const seedRoots = roots.length > 0 ? roots : [nodes[0]];

  const placed = new Set<string>();
  const levels: TreeNode[][] = [];
  let queue = seedRoots;
  while (queue.length > 0) {
    const layer: TreeNode[] = [];
    const next: TreeNode[] = [];
    for (const n of queue) {
      if (placed.has(n.id)) continue;
      placed.add(n.id);
      layer.push(n);
      for (const cid of n.children ?? []) {
        const c = nodes.find((x) => x.id === cid);
        if (c && !placed.has(c.id)) next.push(c);
      }
    }
    if (layer.length > 0) levels.push(layer);
    queue = next;
  }
  // 미배치 노드(고립) 마지막에 자기 행으로
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      levels.push([n]);
      placed.add(n.id);
    }
  }
  return levels;
}

/* ── Main component ──────────────────────────────────── */

export function AdminTechTreeEditor() {
  const { toast } = useToast();
  const [paths, setPaths] = useState<TreePath[]>([]);
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [galleryFor, setGalleryFor] = useState<{ pathId: string; parentId: string | null } | null>(null);
  const [editingNode, setEditingNode] = useState<{ pathId: string; node: TreeNode } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [tt, lvs] = await Promise.all([
          apiFetch<{ paths: TreePath[] }>("/tech-tree"),
          apiFetch<Live[]>("/lives"),
        ]);
        setPaths(tt.paths);
        setLives(Array.isArray(lvs) ? lvs : []);
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

  const addPath = () => setPaths((prev) => [...prev, emptyPath(prev.length)]);

  const updateNode = (pathId: string, nodeId: string, patch: Partial<TreeNode>) => {
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p;
        return { ...p, nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)) };
      })
    );
  };

  const removeNode = (pathId: string, nodeId: string) => {
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

  /** 갤러리에서 라이브 선택 → 해당 path에 노드 생성 후 (parentId가 있으면) 자식으로 추가 */
  const addNodeFromLive = (pathId: string, parentId: string | null, live: Live) => {
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p;
        const allIds = new Set(p.nodes.map((n) => n.id));
        const parent = parentId ? p.nodes.find((n) => n.id === parentId) ?? null : null;
        const newNode = nodeFromLive(live, parent, allIds);
        const updatedNodes = parentId
          ? p.nodes.map((n) =>
              n.id === parentId ? { ...n, children: [...(n.children ?? []), newNode.id] } : n
            )
          : p.nodes;
        return { ...p, nodes: [...updatedNodes, newNode] };
      })
    );
  };

  /** 드래그&드롭으로 연결: source → target 의미. source의 children에 target 추가. */
  const linkNodes = (pathId: string, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p;
        // 사이클 방지: target에서 source로 이미 도달 가능하면 거부
        const reachableFromTarget = (start: string): Set<string> => {
          const visited = new Set<string>();
          const stack = [start];
          while (stack.length) {
            const cur = stack.pop()!;
            if (visited.has(cur)) continue;
            visited.add(cur);
            const node = p.nodes.find((x) => x.id === cur);
            if (node?.children) for (const c of node.children) stack.push(c);
          }
          return visited;
        };
        if (reachableFromTarget(targetId).has(sourceId)) {
          toast({ variant: "destructive", title: "사이클이 됩니다", description: "이미 반대 방향으로 연결된 경로가 있어요." });
          return p;
        }
        return {
          ...p,
          nodes: p.nodes.map((n) => {
            if (n.id !== sourceId) return n;
            const cur = n.children ?? [];
            if (cur.includes(targetId)) return n;
            return { ...n, children: [...cur, targetId] };
          }),
        };
      })
    );
  };

  const unlinkNodes = (pathId: string, sourceId: string, targetId: string) => {
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p;
        return {
          ...p,
          nodes: p.nodes.map((n) =>
            n.id === sourceId ? { ...n, children: (n.children ?? []).filter((c) => c !== targetId) } : n
          ),
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
            모듈 아래 + 버튼으로 라이브 추가 · 모듈을 끌어다 다른 모듈에 떨어뜨리면 연결 · 짧은 제목은 모듈에서 바로 수정 가능
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={reset} disabled={saving}>
            <RotateCcw className="h-3.5 w-3.5" />기본값으로
          </Button>
          <Button size="sm" className="rounded-lg text-xs gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}저장
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
                <div className="border-t border-gray-100 bg-gray-50/30">
                  {/* Path metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-gray-100 bg-white">
                    <Field label="ID (slug)">
                      <Input className="h-8 text-xs font-mono" value={path.id} onChange={(e) => updatePath(path.id, { id: e.target.value })} />
                    </Field>
                    <Field label="이름">
                      <Input className="h-8 text-xs" value={path.name} onChange={(e) => updatePath(path.id, { name: e.target.value })} />
                    </Field>
                    <Field label="이모지">
                      <Input className="h-8 text-sm text-center" value={path.emoji} onChange={(e) => updatePath(path.id, { emoji: e.target.value })} />
                    </Field>
                    <Field label="색상">
                      <div className="flex gap-1">
                        <input type="color" value={path.color} onChange={(e) => {
                          const c = e.target.value;
                          const r = parseInt(c.slice(1, 3), 16);
                          const g = parseInt(c.slice(3, 5), 16);
                          const b = parseInt(c.slice(5, 7), 16);
                          updatePath(path.id, { color: c, glowColor: `rgba(${r}, ${g}, ${b}, 0.3)` });
                        }} className="h-8 w-8 rounded border border-gray-200 cursor-pointer" />
                        <Input className="h-8 text-xs flex-1 font-mono" value={path.color} onChange={(e) => updatePath(path.id, { color: e.target.value })} />
                      </div>
                    </Field>
                    <div className="col-span-2 sm:col-span-4">
                      <Field label="설명">
                        <Input className="h-8 text-xs" value={path.description} onChange={(e) => updatePath(path.id, { description: e.target.value })} />
                      </Field>
                    </div>
                  </div>

                  {/* Visual canvas */}
                  <div className="p-5">
                    <PathCanvas
                      path={path}
                      lives={lives}
                      onAddRoot={() => setGalleryFor({ pathId: path.id, parentId: null })}
                      onAddChild={(parentId) => setGalleryFor({ pathId: path.id, parentId })}
                      onUpdateNode={(nodeId, patch) => updateNode(path.id, nodeId, patch)}
                      onRemoveNode={(nodeId) => removeNode(path.id, nodeId)}
                      onLink={(srcId, tgtId) => linkNodes(path.id, srcId, tgtId)}
                      onUnlink={(srcId, tgtId) => unlinkNodes(path.id, srcId, tgtId)}
                      onEditFull={(node) => setEditingNode({ pathId: path.id, node })}
                    />
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
          <Plus className="h-4 w-4" />테크트리 추가
        </button>
      </div>

      {/* Gallery modal */}
      {galleryFor && (
        <LiveGalleryModal
          lives={lives}
          existingLiveIds={new Set(paths.find((p) => p.id === galleryFor.pathId)?.nodes.map((n) => n.liveId) ?? [])}
          parentTitle={galleryFor.parentId ? paths.find((p) => p.id === galleryFor.pathId)?.nodes.find((n) => n.id === galleryFor.parentId)?.shortTitle ?? "" : null}
          onClose={() => setGalleryFor(null)}
          onSelect={(live) => {
            addNodeFromLive(galleryFor.pathId, galleryFor.parentId, live);
            setGalleryFor(null);
          }}
        />
      )}

      {/* Full edit modal */}
      {editingNode && (
        <NodeFullEditModal
          node={editingNode.node}
          allNodesInPath={paths.find((p) => p.id === editingNode.pathId)?.nodes ?? []}
          onClose={() => setEditingNode(null)}
          onSave={(updated) => {
            updateNode(editingNode.pathId, editingNode.node.id, updated);
            setEditingNode(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Path Canvas (visual flow) ───────────────────────── */

function PathCanvas({
  path, lives, onAddRoot, onAddChild, onUpdateNode, onRemoveNode, onLink, onUnlink, onEditFull,
}: {
  path: TreePath;
  lives: Live[];
  onAddRoot: () => void;
  onAddChild: (parentId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<TreeNode>) => void;
  onRemoveNode: (nodeId: string) => void;
  onLink: (sourceId: string, targetId: string) => void;
  onUnlink: (sourceId: string, targetId: string) => void;
  onEditFull: (node: TreeNode) => void;
}) {
  const levels = useMemo(() => computeLevels(path.nodes), [path.nodes]);
  const containerRef = useRef<HTMLDivElement>(null);
  const moduleRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [arrows, setArrows] = useState<Array<{ id: string; d: string; src: string; tgt: string }>>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverDropId, setHoverDropId] = useState<string | null>(null);

  // 화살표 좌표 계산
  useLayoutEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const arr: Array<{ id: string; d: string; src: string; tgt: string }> = [];
      for (const node of path.nodes) {
        for (const cid of node.children ?? []) {
          const fromEl = moduleRefs.current.get(node.id);
          const toEl = moduleRefs.current.get(cid);
          if (!fromEl || !toEl) continue;
          const a = fromEl.getBoundingClientRect();
          const b = toEl.getBoundingClientRect();
          const x1 = a.left + a.width / 2 - cRect.left;
          const y1 = a.bottom - cRect.top;
          const x2 = b.left + b.width / 2 - cRect.left;
          const y2 = b.top - cRect.top;
          // 베지어 곡선 (수직 연결)
          const dy = y2 - y1;
          const c1 = `${x1},${y1 + dy * 0.5}`;
          const c2 = `${x2},${y2 - dy * 0.5}`;
          arr.push({ id: `${node.id}->${cid}`, d: `M${x1},${y1} C${c1} ${c2} ${x2},${y2}`, src: node.id, tgt: cid });
        }
      }
      setArrows(arr);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [path.nodes, levels]);

  const livesById = useMemo(() => {
    const m = new Map<number, Live>();
    for (const l of lives) m.set(l.id, l);
    return m;
  }, [lives]);

  if (path.nodes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-400 mb-4">아직 모듈이 없습니다.</p>
        <Button className="rounded-xl text-sm bg-blue-600 hover:bg-blue-700" onClick={onAddRoot}>
          <Plus className="h-4 w-4 mr-1.5" />첫 모듈 추가
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: "200px" }}>
      {/* SVG arrows layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <marker id={`arrow-${path.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={path.color} />
          </marker>
        </defs>
        {arrows.map((a) => (
          <g key={a.id} className="pointer-events-auto group">
            <path d={a.d} stroke={path.color} fill="none" strokeWidth="2" opacity="0.6" markerEnd={`url(#arrow-${path.id})`} />
            {/* 호버 시 굵게 + 연결 끊기 */}
            <path d={a.d} stroke="transparent" fill="none" strokeWidth="14" style={{ cursor: "pointer" }}
              onClick={() => { if (confirm("이 연결을 끊을까요?")) onUnlink(a.src, a.tgt); }} />
          </g>
        ))}
      </svg>

      {/* Levels */}
      <div className="relative flex flex-col gap-12" style={{ zIndex: 2 }}>
        {levels.map((level, li) => (
          <div key={li} className="flex justify-center gap-4 sm:gap-6 flex-wrap">
            {level.map((node) => (
              <ModuleCard
                key={node.id}
                node={node}
                live={livesById.get(node.liveId)}
                pathColor={path.color}
                isDragSource={draggingId === node.id}
                isDropTarget={hoverDropId === node.id && draggingId !== null && draggingId !== node.id}
                refSetter={(el) => { moduleRefs.current.set(node.id, el); }}
                onUpdateShortTitle={(v) => onUpdateNode(node.id, { shortTitle: v })}
                onAddChild={() => onAddChild(node.id)}
                onRemove={() => onRemoveNode(node.id)}
                onEditFull={() => onEditFull(node)}
                onDragStart={() => setDraggingId(node.id)}
                onDragEnd={() => { setDraggingId(null); setHoverDropId(null); }}
                onDragOver={(e) => {
                  if (draggingId && draggingId !== node.id) {
                    e.preventDefault();
                    setHoverDropId(node.id);
                  }
                }}
                onDragLeave={() => { if (hoverDropId === node.id) setHoverDropId(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId && draggingId !== node.id) {
                    onLink(draggingId, node.id);
                  }
                  setDraggingId(null);
                  setHoverDropId(null);
                }}
              />
            ))}
          </div>
        ))}

        {/* + Root 추가 버튼 (좌상단) */}
        <button
          onClick={onAddRoot}
          className="self-center text-xs text-gray-400 hover:text-blue-500 px-4 py-2 rounded-lg border border-dashed border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />루트 모듈 추가 (어떤 모듈의 자식도 아님)
        </button>
      </div>
    </div>
  );
}

/* ── Module Card ─────────────────────────────────────── */

function ModuleCard({
  node, live, pathColor, isDragSource, isDropTarget, refSetter,
  onUpdateShortTitle, onAddChild, onRemove, onEditFull,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: {
  node: TreeNode;
  live: Live | undefined;
  pathColor: string;
  isDragSource: boolean;
  isDropTarget: boolean;
  refSetter: (el: HTMLDivElement | null) => void;
  onUpdateShortTitle: (v: string) => void;
  onAddChild: () => void;
  onRemove: () => void;
  onEditFull: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const thumb = thumbForLive(live);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.shortTitle);

  useEffect(() => { setTitleDraft(node.shortTitle); }, [node.shortTitle]);

  return (
    <div className="flex flex-col items-center" style={{ width: 180 }}>
      <div
        ref={refSetter}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "link";
          e.dataTransfer.setData("text/plain", node.id);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative w-full rounded-xl bg-white border-2 transition-all cursor-grab active:cursor-grabbing ${
          isDropTarget ? "ring-2 ring-blue-400 ring-offset-2" : ""
        } ${isDragSource ? "opacity-40" : ""}`}
        style={{
          borderColor: isDropTarget ? "#3B82F6" : `${pathColor}30`,
          boxShadow: `0 2px 8px ${pathColor}20`,
        }}
      >
        {/* Thumbnail */}
        <div className="w-full aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">썸네일 없음</div>
          )}
          {/* Level badge */}
          <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">
            {node.level.split(" ")[0]}
          </span>
          {/* Tool badge */}
          {node.tool && (
            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: pathColor, color: "#fff" }}>
              {node.tool}
            </span>
          )}
          {/* live id */}
          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white">#{node.liveId}</span>
        </div>

        {/* Body */}
        <div className="p-2.5">
          {editingTitle ? (
            <Input
              autoFocus
              className="h-7 text-xs"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { onUpdateShortTitle(titleDraft); setEditingTitle(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onUpdateShortTitle(titleDraft); setEditingTitle(false); }
                if (e.key === "Escape") { setTitleDraft(node.shortTitle); setEditingTitle(false); }
              }}
            />
          ) : (
            <p
              className="text-xs font-semibold text-gray-800 text-center leading-tight cursor-text hover:bg-blue-50 rounded px-1 py-0.5 min-h-[28px]"
              onClick={() => setEditingTitle(true)}
              title="클릭해서 수정"
            >
              {node.shortTitle || <span className="text-gray-300">짧은 제목 입력</span>}
            </p>
          )}
        </div>

        {/* Action buttons (top-right corner) */}
        <div className="absolute -top-2 -right-2 flex gap-1">
          <button
            className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm hover:border-gray-300 text-gray-400 hover:text-gray-600 flex items-center justify-center"
            onClick={onEditFull}
            title="자세히 편집"
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm hover:border-red-300 text-gray-400 hover:text-red-500 flex items-center justify-center"
            onClick={() => { if (confirm(`"${node.shortTitle || node.id}" 모듈을 삭제할까요?`)) onRemove(); }}
            title="삭제"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Drag hint */}
        {isDropTarget && (
          <div className="absolute inset-0 rounded-xl bg-blue-500/5 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-1 rounded shadow">
              <Link2 className="h-3 w-3 inline mr-1" />여기로 연결
            </span>
          </div>
        )}
      </div>

      {/* + 버튼 (모듈 아래) */}
      <div className="relative mt-1.5 flex flex-col items-center">
        <div className="w-px h-3 bg-gray-300" />
        <button
          onClick={onAddChild}
          className="w-7 h-7 rounded-full bg-white border border-dashed border-gray-300 text-gray-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-all"
          title="다음 모듈 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Live Gallery Modal ──────────────────────────────── */

function LiveGalleryModal({
  lives, existingLiveIds, parentTitle, onSelect, onClose,
}: {
  lives: Live[];
  existingLiveIds: Set<number>;
  parentTitle: string | null;
  onSelect: (live: Live) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [hideUsed, setHideUsed] = useState(false);

  const filtered = useMemo(() => {
    let arr = lives;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((l) => l.title.toLowerCase().includes(q) || String(l.id).includes(q));
    }
    if (hideUsed) arr = arr.filter((l) => !existingLiveIds.has(l.id));
    // 최신순 (id 큰 순)
    return [...arr].sort((a, b) => b.id - a.id);
  }, [lives, search, hideUsed, existingLiveIds]);

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="!max-w-[1000px] w-[95vw] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {parentTitle ? <>"{parentTitle}" 다음 모듈로 추가할 라이브 선택</> : "루트 모듈로 추가할 라이브 선택"}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            라이브를 선택하면 제목/설명/썸네일이 자동으로 채워집니다. 이후 짧은 제목만 수정하면 돼요.
          </p>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mt-3 pb-3 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input className="h-9 pl-8 text-sm" placeholder="라이브 제목 또는 #ID로 검색" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
            <input type="checkbox" checked={hideUsed} onChange={(e) => setHideUsed(e.target.checked)} className="rounded" />
            이 패스에 이미 추가된 항목 숨김
          </label>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">조건에 맞는 라이브가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((live) => {
                const thumb = thumbForLive(live);
                const used = existingLiveIds.has(live.id);
                return (
                  <button
                    key={live.id}
                    onClick={() => onSelect(live)}
                    className="text-left rounded-xl border border-gray-100 bg-white hover:border-blue-300 hover:shadow-md transition-all overflow-hidden group relative"
                  >
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">no thumb</div>
                      )}
                      {used && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-[#111318] bg-blue-500 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />이미 추가됨
                          </span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white">#{live.id}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{live.title}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{live.scheduledAt ? new Date(live.scheduledAt).toLocaleDateString("ko-KR") : "—"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Full Edit Modal (advanced fields) ───────────────── */

function NodeFullEditModal({
  node, allNodesInPath, onClose, onSave,
}: {
  node: TreeNode;
  allNodesInPath: TreeNode[];
  onClose: () => void;
  onSave: (n: TreeNode) => void;
}) {
  const [n, setN] = useState<TreeNode>(node);
  const update = (patch: Partial<TreeNode>) => setN((prev) => ({ ...prev, ...patch }));
  const tagsStr = (n.tags ?? []).join(", ");
  const gainsStr = (n.gains ?? []).join("\n");
  const childCandidates = allNodesInPath.filter((x) => x.id !== node.id);
  const selectedChildren = new Set(n.children ?? []);
  const toggleChild = (cid: string) => {
    const next = new Set(selectedChildren);
    next.has(cid) ? next.delete(cid) : next.add(cid);
    update({ children: Array.from(next) });
  };
  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="!max-w-[720px] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-lg font-bold text-gray-900">자세히 편집 — {n.id}</DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            라이브 정보가 자동 채워졌어요. 짧은 제목만 손보거나, 필요하면 이 화면에서 세부 필드 편집.
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="노드 ID">
              <Input className="h-8 text-xs font-mono" value={n.id} onChange={(e) => update({ id: e.target.value })} />
            </Field>
            <Field label="라이브 ID">
              <Input className="h-8 text-xs" type="number" value={n.liveId} onChange={(e) => update({ liveId: parseInt(e.target.value || "0", 10) })} />
            </Field>
          </div>
          <Field label="짧은 제목 (모듈 카드에 표시)">
            <Input className="h-8 text-sm" value={n.shortTitle} onChange={(e) => update({ shortTitle: e.target.value })} />
          </Field>
          <Field label="제목 (자동 채움)">
            <Input className="h-8 text-sm" value={n.title} onChange={(e) => update({ title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="레벨">
              <Input className="h-8 text-xs" value={n.level} onChange={(e) => update({ level: e.target.value })} />
            </Field>
            <Field label="툴 라벨 (분기 진입에만)">
              <Input className="h-8 text-xs" value={n.tool ?? ""} onChange={(e) => update({ tool: e.target.value || undefined })} />
            </Field>
          </div>
          <Field label="YouTube URL (자동 채움)">
            <Input className="h-8 text-xs font-mono" value={n.youtubeUrl} onChange={(e) => update({ youtubeUrl: e.target.value })} />
          </Field>
          <Field label="설명 (자동 채움)">
            <textarea className="w-full text-xs border rounded-lg p-2 resize-none min-h-[60px]" value={n.description} onChange={(e) => update({ description: e.target.value })} />
          </Field>
          <Field label="태그 (쉼표로 구분)">
            <Input className="h-8 text-xs" value={tagsStr} onChange={(e) => update({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
          <Field label="습득 스킬 (한 줄에 하나)">
            <textarea className="w-full text-xs border rounded-lg p-2 resize-none min-h-[80px]" value={gainsStr} onChange={(e) => update({ gains: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
          <Field label={`자식 노드 (${selectedChildren.size}개)`}>
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
          <Button className="rounded-xl text-sm bg-blue-600 hover:bg-blue-700" onClick={() => onSave(n)}>저장</Button>
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
