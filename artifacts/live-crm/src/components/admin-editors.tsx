import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Edit, Trash2, Users, Loader2, Video, CheckCircle, Clock,
  AlertCircle, Send, Eye, MessageCircle, Calendar, ExternalLink,
  DollarSign, UserPlus, FilmIcon,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

interface Editor {
  id: number; name: string; phone: string; email: string | null;
  payType: string; payAmount: number; payNote: string | null;
  bankInfo: string | null; isActive: boolean; createdAt: string;
}

interface VideoProject {
  id: number; title: string; description: string | null;
  editorId: number | null; editorName: string | null;
  status: string; draftDeadline: string | null;
  proposedDeadline: string | null; finalDeadline: string | null;
  driveLink: string | null; thumbnailLink: string | null;
  scheduledUploadAt: string | null; youtubeUrl: string | null;
  payAmount: number | null; isPaid: boolean;
  createdAt: string; updatedAt: string;
}

interface ProjectMessage {
  id: number; projectId: number; senderType: string;
  senderId: number | null; message: string; createdAt: string;
}

/* ── Helpers ─────────────────────────────────────────── */

function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("admin_token");
  return fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Admin-Token": token || "", ...opts?.headers },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "요청 실패");
    if (r.status === 204) return null as T;
    return r.json();
  });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "기획", color: "text-gray-400" },
  assigned: { label: "배정됨", color: "text-blue-400" },
  accepted: { label: "수락", color: "text-cyan-400" },
  date_requested: { label: "날짜 변경 요청", color: "text-amber-400" },
  in_progress: { label: "편집 중", color: "text-purple-400" },
  submitted: { label: "제출됨", color: "text-emerald-400" },
  revision: { label: "수정 요청", color: "text-rose-400" },
  approved: { label: "승인", color: "text-green-400" },
  scheduled: { label: "업로드 예약", color: "text-sky-400" },
  uploaded: { label: "완료", color: "text-[#CC9965]" },
};

const PAY_LABELS: Record<string, string> = {
  per_video: "건당",
  monthly: "월급",
  hourly: "시급",
};

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

function shortDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/* ── Main Component ──────────────────────────────────── */

export function AdminEditors() {
  const { toast } = useToast();

  // State
  const [editors, setEditors] = useState<Editor[]>([]);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"editors" | "projects">("projects");

  // Editor modal
  const [editorModal, setEditorModal] = useState(false);
  const [editingEditor, setEditingEditor] = useState<Editor | null>(null);
  const [editorForm, setEditorForm] = useState({ name: "", phone: "", email: "", password: "", payType: "per_video", payAmount: "0", payNote: "", bankInfo: "" });

  // Project modal
  const [projectModal, setProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<VideoProject | null>(null);
  const [projectForm, setProjectForm] = useState({ title: "", description: "", editorId: "", draftDeadline: "", scheduledUploadAt: "", status: "draft", payAmount: "" });

  // Feedback modal
  const [feedbackModal, setFeedbackModal] = useState<VideoProject | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eds, prjs] = await Promise.all([
        apiFetch<Editor[]>("/editors"),
        apiFetch<VideoProject[]>("/video-projects"),
      ]);
      setEditors(eds);
      setProjects(prjs);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Editor CRUD ──────────────────────────── */

  const openEditorModal = (editor?: Editor) => {
    if (editor) {
      setEditingEditor(editor);
      setEditorForm({ name: editor.name, phone: editor.phone, email: editor.email || "", password: "", payType: editor.payType, payAmount: String(editor.payAmount), payNote: editor.payNote || "", bankInfo: editor.bankInfo || "" });
    } else {
      setEditingEditor(null);
      setEditorForm({ name: "", phone: "", email: "", password: "", payType: "per_video", payAmount: "0", payNote: "", bankInfo: "" });
    }
    setEditorModal(true);
  };

  const saveEditor = async () => {
    try {
      const body = { ...editorForm, payAmount: parseFloat(editorForm.payAmount) || 0 };
      if (editingEditor) {
        await apiFetch(`/editors/${editingEditor.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        if (!body.password) { toast({ variant: "destructive", title: "비밀번호를 입력해주세요" }); return; }
        await apiFetch("/editors", { method: "POST", body: JSON.stringify(body) });
      }
      setEditorModal(false);
      loadData();
      toast({ title: editingEditor ? "편집자 수정 완료" : "편집자 추가 완료" });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    }
  };

  const deleteEditor = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await apiFetch(`/editors/${id}`, { method: "DELETE" });
    loadData();
  };

  /* ── Project CRUD ─────────────────────────── */

  const openProjectModal = (project?: VideoProject) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        title: project.title,
        description: project.description || "",
        editorId: project.editorId ? String(project.editorId) : "",
        draftDeadline: project.draftDeadline ? new Date(project.draftDeadline).toISOString().slice(0, 16) : "",
        scheduledUploadAt: project.scheduledUploadAt ? new Date(project.scheduledUploadAt).toISOString().slice(0, 16) : "",
        status: project.status,
        payAmount: project.payAmount ? String(project.payAmount) : "",
      });
    } else {
      setEditingProject(null);
      setProjectForm({ title: "", description: "", editorId: "", draftDeadline: "", scheduledUploadAt: "", status: "draft", payAmount: "" });
    }
    setProjectModal(true);
  };

  const saveProject = async () => {
    try {
      const body = {
        ...projectForm,
        editorId: projectForm.editorId ? parseInt(projectForm.editorId) : null,
        draftDeadline: projectForm.draftDeadline || null,
        scheduledUploadAt: projectForm.scheduledUploadAt || null,
        payAmount: projectForm.payAmount ? parseFloat(projectForm.payAmount) : null,
      };
      if (editingProject) {
        await apiFetch(`/video-projects/${editingProject.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/video-projects", { method: "POST", body: JSON.stringify(body) });
      }
      setProjectModal(false);
      loadData();
      toast({ title: editingProject ? "프로젝트 수정 완료" : "프로젝트 생성 완료" });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    }
  };

  const deleteProject = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await apiFetch(`/video-projects/${id}`, { method: "DELETE" });
    loadData();
  };

  const updateProjectStatus = async (id: number, status: string) => {
    await apiFetch(`/video-projects/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    loadData();
  };

  /* ── Feedback ─────────────────────────────── */

  const openFeedback = async (project: VideoProject) => {
    setFeedbackModal(project);
    setNewMessage("");
    const msgs = await apiFetch<ProjectMessage[]>(`/video-projects/${project.id}/messages`);
    setMessages(msgs);
  };

  const sendFeedback = async () => {
    if (!feedbackModal || !newMessage.trim()) return;
    await apiFetch(`/video-projects/${feedbackModal.id}/messages`, { method: "POST", body: JSON.stringify({ message: newMessage }) });
    setNewMessage("");
    const msgs = await apiFetch<ProjectMessage[]>(`/video-projects/${feedbackModal.id}/messages`);
    setMessages(msgs);
  };

  /* ── Render ───────────────────────────────── */

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex gap-2">
        <Button variant={tab === "projects" ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setTab("projects")}>
          <FilmIcon className="h-4 w-4 mr-1" /> 영상 파이프라인
        </Button>
        <Button variant={tab === "editors" ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setTab("editors")}>
          <Users className="h-4 w-4 mr-1" /> 편집자 관리
        </Button>
      </div>

      {/* ── Projects Tab ──────────────────────── */}
      {tab === "projects" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">영상 파이프라인</h3>
            <Button size="sm" className="rounded-lg" onClick={() => openProjectModal()}>
              <Plus className="h-4 w-4 mr-1" /> 새 프로젝트
            </Button>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>편집자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>마감일</TableHead>
                  <TableHead>정산</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">프로젝트가 없습니다</TableCell></TableRow>
                ) : projects.map((p) => {
                  const st = STATUS_LABELS[p.status] || { label: p.status, color: "text-gray-400" };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                      <TableCell>{p.editorName || <span className="text-gray-300">미배정</span>}</TableCell>
                      <TableCell><span className={`text-xs font-semibold ${st.color}`}>{st.label}</span></TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {shortDate(p.finalDeadline || p.draftDeadline)}
                        {p.proposedDeadline && <span className="text-amber-500 ml-1">(변경요청: {shortDate(p.proposedDeadline)})</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.payAmount ? formatKRW(p.payAmount) : "-"}
                        {p.isPaid && <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" />}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {p.driveLink && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(p.driveLink!, "_blank")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openFeedback(p)}>
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                        {p.status === "submitted" && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => updateProjectStatus(p.id, "approved")}>승인</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500" onClick={() => updateProjectStatus(p.id, "revision")}>수정요청</Button>
                          </>
                        )}
                        {p.status === "date_requested" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500" onClick={() => {
                            apiFetch(`/video-projects/${p.id}`, { method: "PUT", body: JSON.stringify({ finalDeadline: p.proposedDeadline, status: "accepted" }) }).then(() => loadData());
                          }}>날짜 수락</Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openProjectModal(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => deleteProject(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Editors Tab ───────────────────────── */}
      {tab === "editors" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">편집자 목록</h3>
            <Button size="sm" className="rounded-lg" onClick={() => openEditorModal()}>
              <UserPlus className="h-4 w-4 mr-1" /> 편집자 추가
            </Button>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>페이</TableHead>
                  <TableHead>계좌</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editors.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">편집자가 없습니다</TableCell></TableRow>
                ) : editors.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-sm">{e.phone}</TableCell>
                    <TableCell className="text-sm">{PAY_LABELS[e.payType] || e.payType} {formatKRW(e.payAmount)}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">{e.bankInfo || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold ${e.isActive ? "text-green-500" : "text-gray-400"}`}>
                        {e.isActive ? "활성" : "비활성"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditorModal(e)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => deleteEditor(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Editor Modal ──────────────────────── */}
      <Dialog open={editorModal} onOpenChange={setEditorModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingEditor ? "편집자 수정" : "편집자 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>이름 *</Label><Input value={editorForm.name} onChange={(e) => setEditorForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>연락처 *</Label><Input value={editorForm.phone} onChange={(e) => setEditorForm(f => ({ ...f, phone: e.target.value }))} placeholder="01012345678" /></div>
            </div>
            <div><Label>이메일</Label><Input value={editorForm.email} onChange={(e) => setEditorForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>{editingEditor ? "비밀번호 변경 (빈칸이면 유지)" : "비밀번호 *"}</Label><Input type="password" value={editorForm.password} onChange={(e) => setEditorForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>페이 방식</Label>
                <Select value={editorForm.payType} onValueChange={(v) => setEditorForm(f => ({ ...f, payType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_video">건당</SelectItem>
                    <SelectItem value="monthly">월급</SelectItem>
                    <SelectItem value="hourly">시급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>금액 (원)</Label><Input type="number" value={editorForm.payAmount} onChange={(e) => setEditorForm(f => ({ ...f, payAmount: e.target.value }))} /></div>
            </div>
            <div><Label>계좌 정보</Label><Input value={editorForm.bankInfo} onChange={(e) => setEditorForm(f => ({ ...f, bankInfo: e.target.value }))} placeholder="카카오뱅크 123-456-789" /></div>
            <div><Label>정산 메모</Label><Input value={editorForm.payNote} onChange={(e) => setEditorForm(f => ({ ...f, payNote: e.target.value }))} placeholder="매월 1일 정산 등" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorModal(false)}>취소</Button>
            <Button onClick={saveEditor}>{editingEditor ? "수정" : "추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Project Modal ─────────────────────── */}
      <Dialog open={projectModal} onOpenChange={setProjectModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? "프로젝트 수정" : "새 프로젝트"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>제목 *</Label><Input value={projectForm.title} onChange={(e) => setProjectForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>설명</Label><Textarea value={projectForm.description} onChange={(e) => setProjectForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>편집자 배정</Label>
                <Select value={projectForm.editorId} onValueChange={(v) => setProjectForm(f => ({ ...f, editorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {editors.filter(e => e.isActive).map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>상태</Label>
                <Select value={projectForm.status} onValueChange={(v) => setProjectForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>초안 마감일</Label><Input type="datetime-local" value={projectForm.draftDeadline} onChange={(e) => setProjectForm(f => ({ ...f, draftDeadline: e.target.value }))} /></div>
              <div><Label>예약 업로드</Label><Input type="datetime-local" value={projectForm.scheduledUploadAt} onChange={(e) => setProjectForm(f => ({ ...f, scheduledUploadAt: e.target.value }))} /></div>
            </div>
            <div><Label>정산 금액 (원)</Label><Input type="number" value={projectForm.payAmount} onChange={(e) => setProjectForm(f => ({ ...f, payAmount: e.target.value }))} placeholder="건당 금액" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectModal(false)}>취소</Button>
            <Button onClick={saveProject}>{editingProject ? "수정" : "생성"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Feedback Modal ────────────────────── */}
      <Dialog open={!!feedbackModal} onOpenChange={() => setFeedbackModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>피드백 — {feedbackModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-3 py-2">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">아직 메시지가 없습니다</p>
            ) : messages.map((m) => (
              <div key={m.id} className={`p-3 rounded-xl text-sm ${m.senderType === "pd" ? "bg-blue-50 text-blue-900 ml-8" : "bg-gray-50 text-gray-800 mr-8"}`}>
                <p className="text-[10px] font-semibold text-gray-400 mb-1">{m.senderType === "pd" ? "PD" : "편집자"} · {new Date(m.createdAt).toLocaleString("ko-KR")}</p>
                <p>{m.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="피드백을 입력하세요..." onKeyDown={(e) => e.key === "Enter" && sendFeedback()} />
            <Button onClick={sendFeedback} disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
