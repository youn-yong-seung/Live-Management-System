import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LogIn, LogOut, Loader2, CheckCircle, Clock, Calendar,
  Send, MessageCircle, ExternalLink, Film, AlertCircle,
  CalendarClock, Upload, DollarSign,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

interface EditorInfo { id: number; name: string; phone: string; email: string | null; }

interface Project {
  id: number; title: string; description: string | null;
  status: string; draftDeadline: string | null;
  proposedDeadline: string | null; finalDeadline: string | null;
  driveLink: string | null; scheduledUploadAt: string | null;
  youtubeUrl: string | null; payAmount: number | null;
  isPaid: boolean; paidAt: string | null; createdAt: string;
}

interface Message {
  id: number; projectId: number; senderType: string;
  senderId: number | null; message: string; createdAt: string;
}

/* ── Helpers ─────────────────────────────────────────── */

function editorFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("editor_token");
  return fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Editor-Token": token || "", ...opts?.headers },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "요청 실패");
    return r.json();
  });
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  assigned:       { label: "편집 요청", color: "text-blue-400", bg: "bg-blue-500/15" },
  accepted:       { label: "수락됨", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  date_requested: { label: "날짜 변경 요청 중", color: "text-amber-400", bg: "bg-amber-500/15" },
  in_progress:    { label: "편집 중", color: "text-purple-400", bg: "bg-purple-500/15" },
  submitted:      { label: "검토 대기", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  revision:       { label: "수정 요청", color: "text-rose-400", bg: "bg-rose-500/15" },
  approved:       { label: "승인 완료", color: "text-green-400", bg: "bg-green-500/15" },
  scheduled:      { label: "업로드 예약", color: "text-sky-400", bg: "bg-sky-500/15" },
  uploaded:       { label: "업로드 완료", color: "text-[#CC9965]", bg: "bg-[#CC9965]/15" },
};

function shortDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

/* ── Login Screen ───────────────────────────────────── */

function LoginScreen({ onLogin }: { onLogin: (editor: EditorInfo) => void }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/editor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem("editor_token", data.token);
      onLogin(data.editor);
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#050A0A" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-black text-[#CC9965]">윤자동</span>
          <span className="text-white/40 text-sm ml-2">편집자 포털</span>
        </div>
        <div className="glass-card p-6 space-y-4">
          <div>
            <Label className="text-white/60 text-sm">연락처</Label>
            <Input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div>
            <Label className="text-white/60 text-sm">비밀번호</Label>
            <Input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button onClick={handleLogin} disabled={loading} className="w-full bg-[#CC9965] hover:bg-[#d4a570] text-black font-bold gold-glow">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-2" /> 로그인</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Project Card ───────────────────────────────────── */

function ProjectCard({ project, onAction }: {
  project: Project;
  onAction: (action: string, project: Project) => void;
}) {
  const st = STATUS_MAP[project.status] || { label: project.status, color: "text-white/40", bg: "bg-white/5" };
  const deadline = project.finalDeadline || project.draftDeadline;

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{project.title}</h3>
          {project.description && <p className="text-xs text-white/40 mt-1 line-clamp-2">{project.description}</p>}
        </div>
        <span className={`flex-shrink-0 ml-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.color} ${st.bg}`}>
          {st.label}
        </span>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-white/50">
          <Calendar className="h-3.5 w-3.5 text-[#CC9965]" />
          <span>마감: {shortDate(deadline)}</span>
        </div>
        {project.scheduledUploadAt && (
          <div className="flex items-center gap-2 text-white/50">
            <Upload className="h-3.5 w-3.5 text-sky-400" />
            <span>업로드: {shortDate(project.scheduledUploadAt)}</span>
          </div>
        )}
        {project.payAmount && (
          <div className="flex items-center gap-2 text-white/50">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span>{formatKRW(project.payAmount)} {project.isPaid ? "✓ 정산완료" : ""}</span>
          </div>
        )}
        {project.youtubeUrl && (
          <a href={project.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#CC9965] hover:text-[#d4a570]">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>YouTube</span>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
        {(project.status === "assigned") && (
          <>
            <Button size="sm" className="bg-[#CC9965] hover:bg-[#d4a570] text-black font-bold text-xs rounded-lg gold-glow" onClick={() => onAction("accept", project)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> 수락
            </Button>
            <Button size="sm" variant="outline" className="border-white/10 text-white/60 text-xs rounded-lg hover:bg-white/5" onClick={() => onAction("propose-date", project)}>
              <CalendarClock className="h-3.5 w-3.5 mr-1" /> 날짜 변경
            </Button>
          </>
        )}
        {(project.status === "accepted" || project.status === "in_progress" || project.status === "revision") && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg" onClick={() => onAction("submit", project)}>
            <Upload className="h-3.5 w-3.5 mr-1" /> 편집 완료 제출
          </Button>
        )}
        <Button size="sm" variant="outline" className="border-white/10 text-white/60 text-xs rounded-lg hover:bg-white/5" onClick={() => onAction("messages", project)}>
          <MessageCircle className="h-3.5 w-3.5 mr-1" /> 피드백
        </Button>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

export default function EditorPortal() {
  const { toast } = useToast();
  const [editor, setEditor] = useState<EditorInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  // Modals
  const [dateModal, setDateModal] = useState<Project | null>(null);
  const [proposedDate, setProposedDate] = useState("");
  const [dateMessage, setDateMessage] = useState("");

  const [submitModal, setSubmitModal] = useState<Project | null>(null);
  const [driveLink, setDriveLink] = useState("");
  const [thumbnailLink, setThumbnailLink] = useState("");

  const [msgModal, setMsgModal] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");

  // Check session
  useEffect(() => {
    const token = sessionStorage.getItem("editor_token");
    if (!token) { setChecking(false); return; }
    editorFetch<{ valid: boolean; editor: EditorInfo }>("/editor/session")
      .then((d) => setEditor(d.editor))
      .catch(() => sessionStorage.removeItem("editor_token"))
      .finally(() => setChecking(false));
  }, []);

  // Load projects
  const loadProjects = useCallback(async () => {
    if (!editor) return;
    setLoading(true);
    try {
      const prjs = await editorFetch<Project[]>("/editor/projects");
      setProjects(prjs);
    } catch { /* ignore */ }
    setLoading(false);
  }, [editor]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const logout = () => {
    sessionStorage.removeItem("editor_token");
    setEditor(null);
    setProjects([]);
  };

  // Actions
  const handleAction = (action: string, project: Project) => {
    if (action === "accept") {
      editorFetch(`/editor/projects/${project.id}/accept`, { method: "PUT" })
        .then(() => { toast({ title: "수락 완료!" }); loadProjects(); })
        .catch((e) => toast({ variant: "destructive", title: (e as Error).message }));
    } else if (action === "propose-date") {
      setDateModal(project);
      setProposedDate("");
      setDateMessage("");
    } else if (action === "submit") {
      setSubmitModal(project);
      setDriveLink(project.driveLink || "");
      setThumbnailLink("");
    } else if (action === "messages") {
      setMsgModal(project);
      setNewMsg("");
      editorFetch<Message[]>(`/editor/projects/${project.id}/messages`).then(setMessages);
    }
  };

  const submitProposedDate = async () => {
    if (!dateModal || !proposedDate) return;
    try {
      await editorFetch(`/editor/projects/${dateModal.id}/propose-date`, {
        method: "PUT", body: JSON.stringify({ proposedDeadline: proposedDate, message: dateMessage || undefined }),
      });
      setDateModal(null);
      toast({ title: "날짜 변경 요청 완료" });
      loadProjects();
    } catch (e) { toast({ variant: "destructive", title: (e as Error).message }); }
  };

  const submitDriveLink = async () => {
    if (!submitModal || !driveLink) return;
    try {
      await editorFetch(`/editor/projects/${submitModal.id}/submit`, {
        method: "PUT", body: JSON.stringify({ driveLink, thumbnailLink: thumbnailLink || undefined }),
      });
      setSubmitModal(null);
      toast({ title: "편집 완료 제출됨!" });
      loadProjects();
    } catch (e) { toast({ variant: "destructive", title: (e as Error).message }); }
  };

  const sendMessage = async () => {
    if (!msgModal || !newMsg.trim()) return;
    await editorFetch(`/editor/projects/${msgModal.id}/messages`, {
      method: "POST", body: JSON.stringify({ message: newMsg }),
    });
    setNewMsg("");
    const msgs = await editorFetch<Message[]>(`/editor/projects/${msgModal.id}/messages`);
    setMessages(msgs);
  };

  // Checking session...
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#050A0A" }}>
      <Loader2 className="h-6 w-6 animate-spin text-[#CC9965]" />
    </div>
  );

  // Not logged in
  if (!editor) return <LoginScreen onLogin={(e) => setEditor(e)} />;

  // Logged in
  const activeProjects = projects.filter((p) => !["uploaded", "approved"].includes(p.status));
  const completedProjects = projects.filter((p) => ["uploaded", "approved"].includes(p.status));

  return (
    <div className="min-h-screen" style={{ background: "#050A0A" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[rgba(5,10,10,0.85)] border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#CC9965]">윤자동</span>
            <span className="text-xs text-white/30">편집자 포털</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60">{editor.name}님</span>
            <Button size="sm" variant="ghost" className="text-white/40 hover:text-white" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Active Projects */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Film className="h-5 w-5 text-[#CC9965]" />
            진행 중인 프로젝트 <span className="text-sm text-white/30 font-normal">({activeProjects.length})</span>
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
          ) : activeProjects.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-400/30 mx-auto mb-3" />
              <p className="text-white/40 text-sm">진행 중인 프로젝트가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeProjects.map((p) => <ProjectCard key={p.id} project={p} onAction={handleAction} />)}
            </div>
          )}
        </div>

        {/* Completed */}
        {completedProjects.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              완료된 프로젝트 <span className="text-sm text-white/30 font-normal">({completedProjects.length})</span>
            </h2>
            <div className="space-y-4">
              {completedProjects.map((p) => <ProjectCard key={p.id} project={p} onAction={handleAction} />)}
            </div>
          </div>
        )}

        {/* Pay Summary */}
        {projects.length > 0 && (
          <div className="glass-card-gold p-5">
            <h3 className="text-sm font-bold text-[#CC9965] mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> 정산 내역
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs">총 정산 예정</p>
                <p className="text-white font-bold">{formatKRW(projects.reduce((s, p) => s + (p.payAmount || 0), 0))}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">정산 완료</p>
                <p className="text-emerald-400 font-bold">{formatKRW(projects.filter(p => p.isPaid).reduce((s, p) => s + (p.payAmount || 0), 0))}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Date Proposal Modal ────────────────── */}
      <Dialog open={!!dateModal} onOpenChange={() => setDateModal(null)}>
        <DialogContent className="sm:max-w-[400px] bg-[#0a1515] border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-white">날짜 변경 요청</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-white/60">원래 마감일</Label>
              <p className="text-sm text-white/80 mt-1">{shortDate(dateModal?.draftDeadline ?? null)}</p>
            </div>
            <div>
              <Label className="text-white/60">희망 날짜 *</Label>
              <Input type="datetime-local" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)}
                className="mt-1 bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-white/60">사유 (선택)</Label>
              <Textarea value={dateMessage} onChange={(e) => setDateMessage(e.target.value)}
                placeholder="날짜 변경 사유를 입력해주세요"
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateModal(null)} className="border-white/10 text-white/60">취소</Button>
            <Button onClick={submitProposedDate} className="bg-[#CC9965] text-black font-bold">요청하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Modal ───────────────────────── */}
      <Dialog open={!!submitModal} onOpenChange={() => setSubmitModal(null)}>
        <DialogContent className="sm:max-w-[400px] bg-[#0a1515] border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-white">편집 완료 제출</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-white/60">구글 드라이브 링크 *</Label>
              <Input value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div>
              <Label className="text-white/60">썸네일 링크 (선택)</Label>
              <Input value={thumbnailLink} onChange={(e) => setThumbnailLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitModal(null)} className="border-white/10 text-white/60">취소</Button>
            <Button onClick={submitDriveLink} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">제출하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Messages Modal ─────────────────────── */}
      <Dialog open={!!msgModal} onOpenChange={() => setMsgModal(null)}>
        <DialogContent className="sm:max-w-[480px] bg-[#0a1515] border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-white">피드백 — {msgModal?.title}</DialogTitle></DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-3 py-2">
            {messages.length === 0 ? (
              <p className="text-center text-white/30 text-sm py-4">아직 메시지가 없습니다</p>
            ) : messages.map((m) => (
              <div key={m.id} className={`p-3 rounded-xl text-sm ${
                m.senderType === "pd"
                  ? "bg-[#CC9965]/10 border border-[#CC9965]/20 ml-6"
                  : "bg-white/5 border border-white/5 mr-6"
              }`}>
                <p className="text-[10px] font-semibold text-white/30 mb-1">
                  {m.senderType === "pd" ? "PD" : "나"} · {new Date(m.createdAt).toLocaleString("ko-KR")}
                </p>
                <p className="text-white/80">{m.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <Button onClick={sendMessage} disabled={!newMsg.trim()} className="bg-[#CC9965] text-black">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
