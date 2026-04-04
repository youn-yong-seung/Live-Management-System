import { useState, useEffect, useCallback } from "react";
import {
  useGetLives, getGetLivesQueryKey,
  useCreateLive, useUpdateLive, useDeleteLive,
  useGetRegistrations, getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import type { Live, LiveStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import {
  Plus, Edit, Trash2, Users, Loader2, RefreshCw, Settings,
  Bell, Send, Eye, CheckCircle, Clock, AlertCircle, KeyRound,
  MessageSquare, Zap, Lock, Youtube, TrendingUp, ThumbsUp,
  MessageCircle, PlayCircle, BarChart2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ── Types ─────────────────────────────────────────── */

interface SolapiConfig {
  apiKey: string | null;
  senderPhone: string | null;
  senderKey: string | null;
  configured: boolean;
}

interface SolapiTemplate {
  templateId: string;
  name: string;
  content?: string;
  status?: string;
}

interface RegistrationTrigger {
  messageType: string;
  templateId: string | null;
  templateName: string | null;
  messageBody: string | null;
  enabled: boolean;
}

interface NotificationRule {
  id: number;
  liveId: number;
  offsetMinutes: number;
  messageType: string;
  templateId: string | null;
  templateName: string | null;
  messageBody: string | null;
  customTime: string | null;
  enabled: boolean;
}

interface ScheduleEntry {
  ruleId: number;
  liveId: number;
  liveTitle: string;
  offsetMinutes: number;
  offsetLabel: string;
  templateId: string | null;
  templateName: string | null;
  fireAt: string | null;
  recipientCount: number;
  status: "pending" | "sent" | "overdue";
  sentAt: string | null;
  successCount: number | null;
}

interface NotificationLogEntry {
  id: number;
  liveId: number;
  liveTitle: string;
  templateId: string | null;
  templateName: string | null;
  recipientCount: number;
  successCount: number;
  sentAt: string;
  status: string;
  isImmediate: boolean;
  ruleId: number | null;
}

interface YoutubeStats {
  liveId: number;
  liveTitle?: string;
  scheduledAt?: string | null;
  views: number;
  peakConcurrent: number;
  watchTimeMinutes: number;
  likes: number;
  comments: number;
}

/* ── API helper ────────────────────────────────────── */

async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Constants ─────────────────────────────────────── */

const OFFSET_LABELS: Record<number, string> = {
  [-1440]: "1일 전",
  [-180]: "3시간 전",
  [-60]: "1시간 전",
  [-30]: "30분 전",
  [-10]: "10분 전",
  [10]: "시작 10분 후",
};

function formatOffsetLabel(offsetMinutes: number): string {
  if (OFFSET_LABELS[offsetMinutes]) return OFFSET_LABELS[offsetMinutes];
  if (offsetMinutes === 0) return "방송 시작 시";
  const abs = Math.abs(offsetMinutes);
  const dir = offsetMinutes < 0 ? "전" : "후";
  const days = Math.floor(abs / 1440);
  const hours = Math.floor((abs % 1440) / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (mins > 0) parts.push(`${mins}분`);
  return (parts.join(" ") || "0분") + " " + dir;
}

function offsetToComponents(offsetMinutes: number) {
  const abs = Math.abs(offsetMinutes);
  return {
    days: Math.floor(abs / 1440),
    hours: Math.floor((abs % 1440) / 60),
    mins: abs % 60,
    dir: offsetMinutes <= 0 ? "before" : "after" as "before" | "after",
  };
}

function componentsToOffset(days: number, hours: number, mins: number, dir: "before" | "after") {
  const total = days * 1440 + hours * 60 + mins;
  return dir === "before" ? -total : total;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  live: { label: "진행중", className: "bg-red-50 text-red-600" },
  scheduled: { label: "예정됨", className: "bg-blue-50 text-blue-600" },
  ended: { label: "종료됨", className: "bg-gray-100 text-gray-500" },
};

/* ── Message type badge ────────────────────────────── */

function MsgTypeBadge({ type }: { type: string }) {
  return type === "sms"
    ? <span className="text-xs font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">문자</span>
    : <span className="text-xs font-bold bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">알림톡</span>;
}

/* ═══════════════════════════════════════════════════ */
/*  Admin Page                                          */
/* ═══════════════════════════════════════════════════ */

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ── Solapi state ──────────────────────────────── */
  const [solapiConfig, setSolapiConfig] = useState<SolapiConfig | null>(null);
  const [templates, setTemplates] = useState<SolapiTemplate[]>([]);
  const [configForm, setConfigForm] = useState({ apiKey: "", apiSecret: "", senderPhone: "", senderKey: "" });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);

  /* ── Live management state ─────────────────────── */
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [selectedLiveForRegs, setSelectedLiveForRegs] = useState<number | null>(null);
  const [liveForm, setLiveForm] = useState<{
    id?: number; title: string; description: string; youtubeUrl: string;
    scheduledAt: string; status: LiveStatus; thumbnailUrl: string;
  }>({ title: "", description: "", youtubeUrl: "", scheduledAt: "", status: "scheduled", thumbnailUrl: "" });

  /* ── Immediate send state ──────────────────────── */
  const [sendModal, setSendModal] = useState<{ live: Live | null; open: boolean }>({ live: null, open: false });
  const [sendMsgType, setSendMsgType] = useState<"alimtalk" | "sms">("alimtalk");
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [sendMsgBody, setSendMsgBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  /* ── Notification rules state ──────────────────── */
  const [rulesModal, setRulesModal] = useState<{ live: Live | null; open: boolean }>({ live: null, open: false });
  const [notifRules, setNotifRules] = useState<NotificationRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [triggerConfig, setTriggerConfig] = useState<RegistrationTrigger>({
    messageType: "alimtalk", templateId: null, templateName: null, messageBody: null, enabled: false,
  });

  /* ── Offset edit state ─────────────────────────── */
  const [editingOffsetIdx, setEditingOffsetIdx] = useState<number | null>(null);
  const [offsetEdit, setOffsetEdit] = useState({ days: 0, hours: 0, mins: 0, dir: "before" as "before" | "after" });

  /* ── Auth gate state ───────────────────────────── */
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return sessionStorage.getItem("crm_admin_auth") === "1"; } catch { return false; }
  });
  const [loginPwd, setLoginPwd] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  /* ── YouTube stats state ───────────────────────── */
  const [ytStatsAll, setYtStatsAll] = useState<YoutubeStats[]>([]);
  const [ytEditLiveId, setYtEditLiveId] = useState<number | null>(null);
  const [ytForm, setYtForm] = useState({ views: 0, peakConcurrent: 0, watchTimeMinutes: 0, likes: 0, comments: 0 });
  const [isSavingYt, setIsSavingYt] = useState(false);
  const [isLoadingYt, setIsLoadingYt] = useState(false);

  /* ── Password change state ─────────────────────── */
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  /* ── Schedule / Log state ──────────────────────── */
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [notifLog, setNotifLog] = useState<NotificationLogEntry[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  /* ── Existing hooks ────────────────────────────── */
  const { data: lives, isLoading: isLivesLoading, refetch: refetchLives } = useGetLives(
    {}, { query: { queryKey: getGetLivesQueryKey() } }
  );
  const { data: registrations, isLoading: isRegistrationsLoading } = useGetRegistrations(
    selectedLiveForRegs || 0,
    { query: { queryKey: ["registrations", selectedLiveForRegs], enabled: !!selectedLiveForRegs && isRegistrationsModalOpen } }
  );
  const createLive = useCreateLive();
  const updateLive = useUpdateLive();
  const deleteLive = useDeleteLive();

  /* ── Login handler ─────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await apiFetch("/admin/login", { method: "POST", body: JSON.stringify({ password: loginPwd }) });
      sessionStorage.setItem("crm_admin_auth", "1");
      setIsAuthenticated(true);
      setLoginPwd("");
    } catch (err) {
      toast({ variant: "destructive", title: "로그인 실패", description: String(err) });
    } finally {
      setIsLoggingIn(false);
    }
  };

  /* ── Password change handler ───────────────────── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.next !== pwdForm.confirm) {
      toast({ variant: "destructive", title: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    setIsChangingPwd(true);
    try {
      await apiFetch("/admin/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      toast({ title: "비밀번호 변경 완료" });
      setPwdForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast({ variant: "destructive", title: "비밀번호 변경 실패", description: String(err) });
    } finally {
      setIsChangingPwd(false);
    }
  };

  /* ── YouTube stats functions ───────────────────── */
  const loadYtStatsAll = useCallback(async () => {
    setIsLoadingYt(true);
    try {
      const rows = await apiFetch<YoutubeStats[]>("/youtube-stats/all");
      setYtStatsAll(rows);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingYt(false);
    }
  }, []);

  const loadYtStatsForLive = async (liveId: number) => {
    try {
      const row = await apiFetch<YoutubeStats>(`/lives/${liveId}/youtube-stats`);
      setYtForm({
        views: row.views,
        peakConcurrent: row.peakConcurrent,
        watchTimeMinutes: row.watchTimeMinutes,
        likes: row.likes,
        comments: row.comments,
      });
    } catch {
      setYtForm({ views: 0, peakConcurrent: 0, watchTimeMinutes: 0, likes: 0, comments: 0 });
    }
  };

  const saveYtStats = async () => {
    if (ytEditLiveId === null) return;
    setIsSavingYt(true);
    try {
      await apiFetch(`/lives/${ytEditLiveId}/youtube-stats`, {
        method: "PUT",
        body: JSON.stringify(ytForm),
      });
      toast({ title: "YouTube 지표 저장 완료" });
      loadYtStatsAll();
    } catch (err) {
      toast({ variant: "destructive", title: "저장 실패", description: String(err) });
    } finally {
      setIsSavingYt(false);
    }
  };

  /* ── Load solapi config on mount ───────────────── */
  useEffect(() => {
    apiFetch<SolapiConfig>("/settings/solapi")
      .then((cfg) => {
        setSolapiConfig(cfg);
        setConfigForm((f) => ({ ...f, apiKey: cfg.apiKey ?? "", senderPhone: cfg.senderPhone ?? "", senderKey: cfg.senderKey ?? "" }));
      })
      .catch(() => {});
  }, []);

  /* ── Fetch templates ───────────────────────────── */
  const fetchTemplates = useCallback(async (silent = false) => {
    setIsFetchingTemplates(true);
    try {
      const tpls = await apiFetch<SolapiTemplate[]>("/solapi/templates");
      setTemplates(tpls);
      if (!silent) toast({ title: `템플릿 ${tpls.length}개를 불러왔습니다.` });
      return tpls;
    } catch (err) {
      if (!silent) toast({ variant: "destructive", title: "템플릿 불러오기 실패", description: String(err) });
      return [];
    } finally {
      setIsFetchingTemplates(false);
    }
  }, [toast]);

  /* ── Test connection ───────────────────────────── */
  const testConnection = async () => {
    setIsTestingConn(true);
    try {
      const tpls = await apiFetch<SolapiTemplate[]>("/solapi/templates");
      setTemplates(tpls);
      toast({ title: "연결 성공 ✓", description: `Solapi API에 연결되었습니다. 템플릿 ${tpls.length}개 확인.` });
    } catch (err) {
      toast({ variant: "destructive", title: "연결 실패", description: String(err) });
    } finally {
      setIsTestingConn(false);
    }
  };

  /* ── Save solapi config ────────────────────────── */
  const saveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await apiFetch("/settings/solapi", { method: "PUT", body: JSON.stringify(configForm) });
      const cfg = await apiFetch<SolapiConfig>("/settings/solapi");
      setSolapiConfig(cfg);
      toast({ title: "저장 완료", description: "Solapi 자격증명이 저장되었습니다." });
    } catch (err) {
      toast({ variant: "destructive", title: "저장 실패", description: String(err) });
    } finally {
      setIsSavingConfig(false);
    }
  };

  /* ── Load schedule & log ───────────────────────── */
  const loadSchedule = useCallback(async () => {
    setIsLoadingSchedule(true);
    try {
      const [sched, log] = await Promise.all([
        apiFetch<ScheduleEntry[]>("/notifications/schedule"),
        apiFetch<NotificationLogEntry[]>("/notifications/log"),
      ]);
      setSchedule(sched);
      setNotifLog(log);
    } catch { } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  /* ── Open immediate send modal ─────────────────── */
  const openSendModal = async (live: Live) => {
    setSendModal({ live, open: true });
    setSendMsgType("alimtalk");
    setSendTemplateId("");
    setSendMsgBody("");
    if (templates.length === 0 && solapiConfig?.configured) {
      fetchTemplates(true);
    }
  };

  /* ── Immediate send ────────────────────────────── */
  const handleSendNow = async () => {
    if (!sendModal.live) return;
    const tpl = templates.find((t) => t.templateId === sendTemplateId);
    if (sendMsgType === "alimtalk" && !sendTemplateId) return;
    if (sendMsgType === "sms" && !sendMsgBody.trim()) return;

    setIsSending(true);
    try {
      const body: Record<string, string> = { messageType: sendMsgType };
      if (sendMsgType === "alimtalk") { body.templateId = sendTemplateId; if (tpl?.name) body.templateName = tpl.name; }
      if (sendMsgType === "sms") body.messageBody = sendMsgBody;

      const result = await apiFetch<{ successCount: number; recipientCount: number }>(`/lives/${sendModal.live.id}/send-now`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast({ title: "발송 완료", description: `${result.successCount}/${result.recipientCount}명에게 메시지를 발송했습니다.` });
      setSendModal({ live: null, open: false });
      loadSchedule();
    } catch (err) {
      toast({ variant: "destructive", title: "발송 실패", description: String(err) });
    } finally {
      setIsSending(false);
    }
  };

  /* ── Open notification rules modal ─────────────── */
  const openRulesModal = async (live: Live) => {
    setRulesModal({ live, open: true });
    setIsLoadingRules(true);
    setEditingOffsetIdx(null);
    try {
      const [rules, trigger] = await Promise.all([
        apiFetch<NotificationRule[]>(`/lives/${live.id}/notification-rules`),
        apiFetch<RegistrationTrigger>(`/lives/${live.id}/registration-trigger`),
      ]);
      setNotifRules(rules);
      setTriggerConfig(trigger);
      if (templates.length === 0 && solapiConfig?.configured) {
        fetchTemplates(true);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "오류", description: String(err) });
    } finally {
      setIsLoadingRules(false);
    }
  };

  /* ── Save notification rules + trigger ─────────── */
  const saveRules = async () => {
    if (!rulesModal.live) return;
    setIsSavingRules(true);
    try {
      await Promise.all([
        apiFetch(`/lives/${rulesModal.live.id}/notification-rules`, {
          method: "PUT",
          body: JSON.stringify(notifRules),
        }),
        apiFetch(`/lives/${rulesModal.live.id}/registration-trigger`, {
          method: "PUT",
          body: JSON.stringify(triggerConfig),
        }),
      ]);
      toast({ title: "저장 완료", description: "알림 캠페인이 저장되었습니다." });
      setRulesModal({ live: null, open: false });
      loadSchedule();
    } catch (err) {
      toast({ variant: "destructive", title: "저장 실패", description: String(err) });
    } finally {
      setIsSavingRules(false);
    }
  };

  /* ── Live CRUD ─────────────────────────────────── */
  const handleOpenLiveModal = (live?: Live) => {
    if (live) {
      const scheduledAtDate = live.scheduledAt ? new Date(live.scheduledAt) : new Date();
      const local = new Date(scheduledAtDate.getTime() - scheduledAtDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setLiveForm({ id: live.id, title: live.title, description: live.description || "", youtubeUrl: live.youtubeUrl || "", scheduledAt: live.scheduledAt ? local : "", status: live.status, thumbnailUrl: live.thumbnailUrl || "" });
    } else {
      setLiveForm({ title: "", description: "", youtubeUrl: "", scheduledAt: "", status: "scheduled", thumbnailUrl: "" });
    }
    setIsLiveModalOpen(true);
  };

  const handleSaveLive = async () => {
    if (!liveForm.title) { toast({ variant: "destructive", title: "오류", description: "제목을 입력해주세요." }); return; }
    try {
      const data = { title: liveForm.title, description: liveForm.description || null, youtubeUrl: liveForm.youtubeUrl || null, scheduledAt: liveForm.scheduledAt ? new Date(liveForm.scheduledAt).toISOString() : null, status: liveForm.status, thumbnailUrl: liveForm.thumbnailUrl || null };
      if (liveForm.id) { await updateLive.mutateAsync({ id: liveForm.id, data }); toast({ title: "수정 완료" }); }
      else { await createLive.mutateAsync({ data }); toast({ title: "생성 완료" }); }
      setIsLiveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch { toast({ variant: "destructive", title: "오류", description: "저장 중 문제가 발생했습니다." }); }
  };

  const handleDeleteLive = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteLive.mutateAsync({ id });
      toast({ title: "삭제 완료" });
      queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch { toast({ variant: "destructive", title: "오류", description: "삭제 실패" }); }
  };

  /* ── Helpers ───────────────────────────────────── */
  const calcFireTime = (live: Live, offsetMinutes: number) => {
    if (!live.scheduledAt) return null;
    return new Date(new Date(live.scheduledAt).getTime() + offsetMinutes * 60 * 1000);
  };

  const updateRule = (idx: number, patch: Partial<NotificationRule>) => {
    setNotifRules((rules) => rules.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  /* ═══════════════════════════════════════════════ */
  /* RENDER                                           */
  /* ═══════════════════════════════════════════════ */

  /* ── Admin Login Gate ─────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-50 rounded-full p-4 mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">관리자 로그인</h1>
            <p className="text-gray-400 text-sm mt-1">관리자 비밀번호를 입력하세요.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-sm text-gray-700">비밀번호</Label>
              <Input
                type="password"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                placeholder="비밀번호 입력"
                className="mt-1 rounded-xl border-gray-200"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold h-11"
              disabled={isLoggingIn || !loginPwd}
            >
              {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              로그인
            </Button>
          </form>
          <p className="text-xs text-gray-300 text-center mt-6">초기 비밀번호: admin1234</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">관리자</h1>
          <p className="text-gray-500 text-sm">라이브 스트리밍과 알림톡 · 문자 캠페인을 관리하세요.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-red-500 rounded-xl"
          onClick={() => { sessionStorage.removeItem("crm_admin_auth"); setIsAuthenticated(false); }}
        >
          <Lock className="h-4 w-4 mr-1" />로그아웃
        </Button>
      </div>

      <Tabs defaultValue="lives">
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="lives" className="rounded-lg text-sm font-medium">라이브 관리</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg text-sm font-medium">API 설정</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-lg text-sm font-medium" onClick={loadSchedule}>발송 현황</TabsTrigger>
          <TabsTrigger value="youtube" className="rounded-lg text-sm font-medium" onClick={loadYtStatsAll}>YouTube 성과</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Live Management ─────────────────── */}
        <TabsContent value="lives" className="mt-6">
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" className="rounded-xl border-gray-200 text-gray-600" onClick={() => refetchLives()} disabled={isLivesLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLivesLoading ? "animate-spin" : ""}`} />새로고침
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold" onClick={() => handleOpenLiveModal()}>
              <Plus className="mr-2 h-4 w-4" />라이브 생성
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">라이브 목록</h2>
            </div>
            {isLivesLoading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : lives && lives.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-500 font-medium text-xs">상태</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">제목</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">예정 일시</TableHead>
                    <TableHead className="text-center text-gray-500 font-medium text-xs">신청자</TableHead>
                    <TableHead className="text-right text-gray-500 font-medium text-xs">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lives.map((live) => {
                    const s = statusConfig[live.status] ?? { label: live.status, className: "bg-gray-100 text-gray-500" };
                    return (
                      <TableRow key={live.id} className="hover:bg-gray-50/50">
                        <TableCell><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span></TableCell>
                        <TableCell className="font-medium text-gray-900">{live.title}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{formatDate(live.scheduledAt)}</TableCell>
                        <TableCell className="text-center">
                          <button className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600" onClick={() => { setSelectedLiveForRegs(live.id); setIsRegistrationsModalOpen(true); }}>
                            <Users className="h-4 w-4" />{live.registrationCount}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" className="h-8 rounded-lg border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 text-xs gap-1" onClick={() => openRulesModal(live)}>
                              <Bell className="h-3.5 w-3.5" />캠페인 설정
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 rounded-lg border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 text-xs gap-1" onClick={() => openSendModal(live)}>
                              <Zap className="h-3.5 w-3.5" />즉시 발송
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200" onClick={() => handleOpenLiveModal(live)}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200" onClick={() => handleDeleteLive(live.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-16 text-center">
                <Settings className="h-6 w-6 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">등록된 라이브가 없습니다.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 2: API Settings ────────────────────── */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-gray-900">Solapi 자격증명</h2>
                <p className="text-xs text-gray-400 mt-0.5">알림톡 · 문자 발송을 위한 API 정보를 입력하세요.</p>
              </div>
              {solapiConfig?.configured && (
                <span className="text-xs font-semibold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">연결됨</span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">API Key</Label>
                <Input placeholder="solapi API Key" value={configForm.apiKey} onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })} className="rounded-xl border-gray-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">
                  API Secret
                  {solapiConfig?.configured && <span className="text-gray-400 font-normal ml-1">(변경 시에만 입력)</span>}
                </Label>
                <Input type="password" placeholder={solapiConfig?.configured ? "••••••••••••" : "solapi API Secret"} value={configForm.apiSecret} onChange={(e) => setConfigForm({ ...configForm, apiSecret: e.target.value })} className="rounded-xl border-gray-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">발신 번호</Label>
                <Input placeholder="01012345678 (하이픈 제외)" value={configForm.senderPhone} onChange={(e) => setConfigForm({ ...configForm, senderPhone: e.target.value })} className="rounded-xl border-gray-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">카카오채널 pfId <span className="text-gray-400 font-normal">(알림톡 전용)</span></Label>
                <Input placeholder="KA01PF..." value={configForm.senderKey} onChange={(e) => setConfigForm({ ...configForm, senderKey: e.target.value })} className="rounded-xl border-gray-200" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold" onClick={saveConfig} disabled={isSavingConfig}>
                {isSavingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}저장
              </Button>
              <Button variant="outline" className="rounded-xl border-gray-200" onClick={testConnection} disabled={isTestingConn || !configForm.apiKey}>
                {isTestingConn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}연결 테스트
              </Button>
              {solapiConfig?.configured && (
                <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => fetchTemplates(false)} disabled={isFetchingTemplates}>
                  {isFetchingTemplates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}템플릿 불러오기
                </Button>
              )}
            </div>
          </div>

          {!solapiConfig?.configured && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
              <p className="text-amber-700 text-sm font-medium">⚠ 자격증명을 입력하고 저장하면 알림톡 · 문자 발송이 활성화됩니다.</p>
              <p className="text-amber-600 text-xs mt-1">문자(SMS/LMS) 발송은 pfId 없이도 사용 가능합니다.</p>
            </div>
          )}

          {/* ── Password Change ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
                <Lock className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">관리자 비밀번호 변경</h2>
                <p className="text-xs text-gray-400 mt-0.5">새로운 비밀번호를 설정하세요.</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="grid gap-4 max-w-sm">
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">현재 비밀번호</Label>
                <Input type="password" value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} placeholder="현재 비밀번호" className="rounded-xl border-gray-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">새 비밀번호</Label>
                <Input type="password" value={pwdForm.next} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })} placeholder="새 비밀번호 (4자 이상)" className="rounded-xl border-gray-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">새 비밀번호 확인</Label>
                <Input type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} placeholder="새 비밀번호 재입력" className="rounded-xl border-gray-200" />
              </div>
              <Button type="submit" className="w-fit bg-gray-900 hover:bg-gray-700 text-white rounded-xl font-semibold" disabled={isChangingPwd || !pwdForm.current || !pwdForm.next || !pwdForm.confirm}>
                {isChangingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}비밀번호 변경
              </Button>
            </form>
          </div>

          {templates.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">
                알림톡 템플릿 목록 <span className="text-sm font-normal text-gray-400 ml-1">{templates.length}개</span>
              </h2>
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div key={tpl.templateId} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{tpl.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{tpl.templateId}</p>
                      {tpl.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.content}</p>}
                    </div>
                    {tpl.status && <span className="text-xs font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex-none">{tpl.status}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Schedule & Log ─────────────────── */}
        <TabsContent value="schedule" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={loadSchedule} disabled={isLoadingSchedule}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingSchedule ? "animate-spin" : ""}`} />새로고침
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <h2 className="font-bold text-gray-900">예정 발송</h2>
              <span className="text-sm text-gray-400 ml-1">{schedule.filter(s => s.status === "pending").length}건</span>
            </div>
            {isLoadingSchedule ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : schedule.filter(s => s.status === "pending").length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-500 font-medium text-xs">라이브</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">발송 시점</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">예정 시각</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">내용</TableHead>
                    <TableHead className="text-center text-gray-500 font-medium text-xs">수신자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.filter(s => s.status === "pending").map((entry) => (
                    <TableRow key={entry.ruleId} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900 max-w-[160px] truncate">{entry.liveTitle}</TableCell>
                      <TableCell><span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{entry.offsetLabel}</span></TableCell>
                      <TableCell className="text-gray-600 text-sm">{entry.fireAt ? new Date(entry.fireAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{entry.templateName ?? entry.templateId ?? "-"}</TableCell>
                      <TableCell className="text-center"><span className="text-sm font-medium">{entry.recipientCount}명</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <Clock className="h-6 w-6 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">예정된 발송이 없습니다.<br />라이브별 캠페인 설정에서 스케줄을 구성하세요.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h2 className="font-bold text-gray-900">발송 기록</h2>
              <span className="text-sm text-gray-400 ml-1">{notifLog.length}건</span>
            </div>
            {notifLog.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-500 font-medium text-xs">라이브</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">유형</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">내용</TableHead>
                    <TableHead className="text-center text-gray-500 font-medium text-xs">수신자</TableHead>
                    <TableHead className="text-center text-gray-500 font-medium text-xs">성공</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">상태</TableHead>
                    <TableHead className="text-gray-500 font-medium text-xs">발송 시각</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifLog.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900 max-w-[130px] truncate">{entry.liveTitle}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${entry.isImmediate ? "bg-orange-50 text-orange-600" : "bg-purple-50 text-purple-600"}`}>
                          {entry.isImmediate ? "즉시" : "예약"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{entry.templateName ?? entry.templateId ?? "-"}</TableCell>
                      <TableCell className="text-center text-sm">{entry.recipientCount}명</TableCell>
                      <TableCell className="text-center text-sm text-green-600 font-medium">{entry.successCount}명</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.status === "sent" ? "bg-green-50 text-green-600" : entry.status === "partial_fail" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                          {entry.status === "sent" ? "완료" : entry.status === "partial_fail" ? "일부 실패" : "실패"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{new Date(entry.sentAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <AlertCircle className="h-6 w-6 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">아직 발송 기록이 없습니다.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 4: YouTube 성과 ───────────────────── */}
        <TabsContent value="youtube" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={loadYtStatsAll} disabled={isLoadingYt}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingYt ? "animate-spin" : ""}`} />새로고침
            </Button>
          </div>

          {/* Stat input card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <Youtube className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">라이브별 YouTube 지표 입력</h2>
                <p className="text-xs text-gray-400 mt-0.5">라이브를 선택하고 지표를 입력 후 저장하세요.</p>
              </div>
            </div>

            <div className="mb-5">
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">라이브 선택</Label>
              <Select
                value={ytEditLiveId !== null ? String(ytEditLiveId) : ""}
                onValueChange={(val) => {
                  const id = parseInt(val, 10);
                  setYtEditLiveId(id);
                  loadYtStatsForLive(id);
                }}
              >
                <SelectTrigger className="rounded-xl border-gray-200 max-w-sm">
                  <SelectValue placeholder="라이브 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {(lives ?? []).map((live) => (
                    <SelectItem key={live.id} value={String(live.id)}>
                      {live.title} <span className="text-gray-400 ml-1">({formatDate(live.scheduledAt)})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ytEditLiveId !== null && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                  {[
                    { key: "views", label: "총 조회수", icon: <Eye className="h-4 w-4 text-blue-500" />, placeholder: "0" },
                    { key: "peakConcurrent", label: "최고 동시시청자", icon: <TrendingUp className="h-4 w-4 text-green-500" />, placeholder: "0" },
                    { key: "watchTimeMinutes", label: "총 시청시간 (분)", icon: <PlayCircle className="h-4 w-4 text-purple-500" />, placeholder: "0.0", isFloat: true },
                    { key: "likes", label: "좋아요", icon: <ThumbsUp className="h-4 w-4 text-yellow-500" />, placeholder: "0" },
                    { key: "comments", label: "댓글 수", icon: <MessageCircle className="h-4 w-4 text-pink-500" />, placeholder: "0" },
                  ].map(({ key, label, icon, placeholder, isFloat }) => (
                    <div key={key} className="grid gap-1.5">
                      <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">{icon}{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={isFloat ? "0.1" : "1"}
                        value={ytForm[key as keyof typeof ytForm]}
                        onChange={(e) => setYtForm({ ...ytForm, [key]: isFloat ? parseFloat(e.target.value) || 0 : parseInt(e.target.value, 10) || 0 })}
                        placeholder={placeholder}
                        className="rounded-xl border-gray-200"
                      />
                    </div>
                  ))}
                </div>
                <Button className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold" onClick={saveYtStats} disabled={isSavingYt}>
                  {isSavingYt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Youtube className="mr-2 h-4 w-4" />}지표 저장
                </Button>
              </>
            )}
          </div>

          {/* Comparison chart */}
          {ytStatsAll.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">라이브별 성과 비교</h2>
                  <p className="text-xs text-gray-400 mt-0.5">전체 라이브의 YouTube 지표를 한눈에 비교하세요.</p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">조회수 · 최고 동시시청자</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ytStatsAll.map((r) => ({ name: r.liveTitle ?? `라이브 ${r.liveId}`, 조회수: r.views, 동시시청자: r.peakConcurrent }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="조회수" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="동시시청자" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">좋아요 · 댓글</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ytStatsAll.map((r) => ({ name: r.liveTitle ?? `라이브 ${r.liveId}`, 좋아요: r.likes, 댓글: r.comments }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="좋아요" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="댓글" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats summary table */}
              <div className="mt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100">
                      <TableHead className="text-xs text-gray-500">라이브</TableHead>
                      <TableHead className="text-xs text-gray-500 text-right">조회수</TableHead>
                      <TableHead className="text-xs text-gray-500 text-right">동시시청자</TableHead>
                      <TableHead className="text-xs text-gray-500 text-right">시청시간(분)</TableHead>
                      <TableHead className="text-xs text-gray-500 text-right">좋아요</TableHead>
                      <TableHead className="text-xs text-gray-500 text-right">댓글</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ytStatsAll.map((row) => (
                      <TableRow key={row.liveId} className="border-gray-50">
                        <TableCell className="font-medium text-sm text-gray-800">{row.liveTitle ?? `라이브 ${row.liveId}`}</TableCell>
                        <TableCell className="text-right text-sm">{row.views.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{row.peakConcurrent.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{row.watchTimeMinutes.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{row.likes.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{row.comments.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {ytStatsAll.length === 0 && !isLoadingYt && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <Youtube className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">아직 입력된 YouTube 지표가 없습니다.</p>
              <p className="text-gray-300 text-xs mt-1">위에서 라이브를 선택하고 지표를 입력해 보세요.</p>
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* ═══ Live CRUD Modal ═══════════════════════════ */}
      <Dialog open={isLiveModalOpen} onOpenChange={setIsLiveModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">{liveForm.id ? "라이브 수정" : "새 라이브 생성"}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">라이브 스트리밍의 상세 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label className="text-sm font-medium text-gray-700">제목</Label><Input value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} placeholder="라이브 제목" className="rounded-xl border-gray-200" /></div>
            <div className="grid gap-2"><Label className="text-sm font-medium text-gray-700">설명</Label><Textarea value={liveForm.description} onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })} placeholder="설명" className="rounded-xl border-gray-200 resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label className="text-sm font-medium text-gray-700">상태</Label>
                <Select value={liveForm.status} onValueChange={(val: LiveStatus) => setLiveForm({ ...liveForm, status: val })}>
                  <SelectTrigger className="rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="scheduled">예정됨</SelectItem><SelectItem value="live">진행중</SelectItem><SelectItem value="ended">종료됨</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label className="text-sm font-medium text-gray-700">예정 일시</Label><Input type="datetime-local" value={liveForm.scheduledAt} onChange={(e) => setLiveForm({ ...liveForm, scheduledAt: e.target.value })} className="rounded-xl border-gray-200" /></div>
            </div>
            <div className="grid gap-2"><Label className="text-sm font-medium text-gray-700">YouTube URL</Label><Input value={liveForm.youtubeUrl} onChange={(e) => setLiveForm({ ...liveForm, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="rounded-xl border-gray-200" /></div>
            <div className="grid gap-2"><Label className="text-sm font-medium text-gray-700">썸네일 URL</Label><Input value={liveForm.thumbnailUrl} onChange={(e) => setLiveForm({ ...liveForm, thumbnailUrl: e.target.value })} placeholder="https://example.com/image.jpg" className="rounded-xl border-gray-200" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setIsLiveModalOpen(false)}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold" onClick={handleSaveLive} disabled={createLive.isPending || updateLive.isPending}>
              {(createLive.isPending || updateLive.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Registrations Modal ══════════════════════ */}
      <Dialog open={isRegistrationsModalOpen} onOpenChange={setIsRegistrationsModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-none"><DialogTitle className="text-lg font-bold text-gray-900">신청자 목록</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {isRegistrationsLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
              : registrations && registrations.length > 0 ? (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="bg-gray-50"><TableHead className="text-xs text-gray-500">이름</TableHead><TableHead className="text-xs text-gray-500">연락처</TableHead><TableHead className="text-xs text-gray-500">이메일</TableHead><TableHead className="text-xs text-gray-500">신청일시</TableHead></TableRow></TableHeader>
                    <TableBody>{registrations.map((reg) => (<TableRow key={reg.id}><TableCell className="font-medium text-gray-900">{reg.name}</TableCell><TableCell className="text-sm text-gray-600">{reg.phone}</TableCell><TableCell className="text-sm text-gray-600">{reg.email || "—"}</TableCell><TableCell className="text-sm text-gray-400">{formatDate(reg.createdAt)}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              ) : <div className="py-16 text-center"><Users className="h-8 w-8 text-gray-200 mx-auto mb-3" /><p className="text-gray-500">아직 신청자가 없습니다.</p></div>}
          </div>
          <DialogFooter className="flex-none pt-4 border-t border-gray-100 mt-4">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl" onClick={() => setIsRegistrationsModalOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Immediate Send Modal ══════════════════════ */}
      <Dialog open={sendModal.open} onOpenChange={(open) => setSendModal({ ...sendModal, open })}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">즉시 발송</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{sendModal.live?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!solapiConfig?.configured && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-700">
                ⚠ Solapi 자격증명을 먼저 API 설정 탭에서 저장해주세요.
              </div>
            )}

            {/* Message type toggle */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">발송 유형</Label>
              <div className="flex gap-2">
                {(["alimtalk", "sms"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSendMsgType(type)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-colors ${sendMsgType === type ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-500 hover:border-blue-300"}`}
                  >
                    {type === "alimtalk" ? "🔔 카카오 알림톡" : "💬 문자(SMS/LMS)"}
                  </button>
                ))}
              </div>
            </div>

            {sendMsgType === "alimtalk" ? (
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">알림톡 템플릿</Label>
                {templates.length > 0 ? (
                  <Select value={sendTemplateId} onValueChange={setSendTemplateId}>
                    <SelectTrigger className="rounded-xl border-gray-200"><SelectValue placeholder="템플릿을 선택하세요" /></SelectTrigger>
                    <SelectContent>{templates.map((t) => <SelectItem key={t.templateId} value={t.templateId}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="Template ID를 직접 입력" value={sendTemplateId} onChange={(e) => setSendTemplateId(e.target.value)} className="rounded-xl border-gray-200" />
                    <Button variant="outline" className="rounded-xl flex-none" onClick={() => fetchTemplates(false)} disabled={isFetchingTemplates || !solapiConfig?.configured}>
                      {isFetchingTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">
                  문자 내용 <span className="text-gray-400 font-normal">{sendMsgBody.length}자 · {new TextEncoder().encode(sendMsgBody).length > 90 ? "LMS" : "SMS"}</span>
                </Label>
                <Textarea
                  placeholder="발송할 문자 내용을 입력하세요..."
                  value={sendMsgBody}
                  onChange={(e) => setSendMsgBody(e.target.value)}
                  className="rounded-xl border-gray-200 min-h-[100px] resize-none"
                />
                <p className="text-xs text-gray-400">90 bytes 초과 시 자동으로 LMS로 발송됩니다.</p>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              <strong>{sendModal.live?.registrationCount ?? 0}명</strong>의 신청자에게 발송됩니다.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setSendModal({ live: null, open: false })}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
              onClick={handleSendNow}
              disabled={isSending || !solapiConfig?.configured || (sendMsgType === "alimtalk" && !sendTemplateId) || (sendMsgType === "sms" && !sendMsgBody.trim())}
            >
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}발송하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Campaign Rules Modal ══════════════════════ */}
      <Dialog open={rulesModal.open} onOpenChange={(open) => setRulesModal({ ...rulesModal, open })}>
        <DialogContent className="sm:max-w-[660px] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-none">
            <DialogTitle className="text-lg font-bold text-gray-900">캠페인 메시지 설정</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{rulesModal.live?.title} · 각 시점별 발송 메시지를 설정하세요.</DialogDescription>
          </DialogHeader>

          {!solapiConfig?.configured && (
            <div className="mx-1 mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-700">
              ⚠ Solapi 자격증명을 먼저 API 설정 탭에서 저장해주세요.
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">

            {/* ═══ 신청 즉시 발송 (Trigger) ══════════════════════ */}
            <div className="rounded-2xl border-2 border-green-200 bg-green-50/30 p-4">
              {/* Trigger header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    <Zap className="h-3 w-3" />신청 즉시 발송
                  </span>
                  <span className="text-xs text-gray-400">신청 완료 시 해당 신청자에게 즉시 발송</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{triggerConfig.enabled ? "활성" : "비활성"}</span>
                  <Switch
                    checked={triggerConfig.enabled}
                    onCheckedChange={(checked) => setTriggerConfig((s) => ({ ...s, enabled: checked }))}
                  />
                </div>
              </div>

              {/* Message type toggle */}
              <div className="flex gap-2 mb-3">
                {(["alimtalk", "sms"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTriggerConfig((s) => ({ ...s, messageType: type }))}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold transition-colors ${triggerConfig.messageType === type ? "bg-green-600 border-green-600 text-white" : "border-gray-200 text-gray-500 hover:border-green-300"}`}
                  >
                    {type === "alimtalk" ? "🔔 알림톡" : "💬 문자"}
                  </button>
                ))}
              </div>

              {/* Content */}
              {triggerConfig.messageType !== "sms" ? (
                templates.length > 0 ? (
                  <Select
                    value={triggerConfig.templateId ?? ""}
                    onValueChange={(val) => {
                      const tpl = templates.find((t) => t.templateId === val);
                      setTriggerConfig((s) => ({ ...s, templateId: val || null, templateName: tpl?.name ?? null }));
                    }}
                  >
                    <SelectTrigger className="rounded-lg border-gray-200 h-9 text-sm"><SelectValue placeholder="알림톡 템플릿 선택" /></SelectTrigger>
                    <SelectContent>{templates.map((t) => <SelectItem key={t.templateId} value={t.templateId}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Template ID 직접 입력"
                    value={triggerConfig.templateId ?? ""}
                    onChange={(e) => setTriggerConfig((s) => ({ ...s, templateId: e.target.value || null, templateName: null }))}
                    className="rounded-lg border-gray-200 h-9 text-sm"
                  />
                )
              ) : (
                <div className="space-y-1">
                  <Textarea
                    placeholder="신청 완료 후 발송할 문자 내용을 입력하세요..."
                    value={triggerConfig.messageBody ?? ""}
                    onChange={(e) => setTriggerConfig((s) => ({ ...s, messageBody: e.target.value || null }))}
                    className="rounded-lg border-gray-200 text-sm resize-none min-h-[72px]"
                  />
                  <p className="text-xs text-gray-400 text-right">{(triggerConfig.messageBody ?? "").length}자</p>
                </div>
              )}
            </div>

            {/* ═══ Divider + scheduled section label ═══════════ */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5" />스케줄 발송
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ═══ Scheduled Rules ══════════════════════════════ */}
            {isLoadingRules ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : notifRules.map((rule, idx) => {
              const defaultFireTime = rulesModal.live ? calcFireTime(rulesModal.live, rule.offsetMinutes) : null;
              const defaultHHMM = defaultFireTime
                ? `${String(defaultFireTime.getHours()).padStart(2, "0")}:${String(defaultFireTime.getMinutes()).padStart(2, "0")}`
                : "";
              const effectiveHHMM = rule.customTime ?? defaultHHMM;
              const label = formatOffsetLabel(rule.offsetMinutes);
              const isSms = rule.messageType === "sms";
              const isEditingOffset = editingOffsetIdx === idx;

              return (
                <div key={rule.id} className={`rounded-xl border p-4 transition-colors ${rule.enabled ? "border-blue-100 bg-blue-50/20" : "border-gray-100 bg-white"}`}>
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isEditingOffset ? (
                        /* ── Inline offset editor ─────────────── */
                        <div className="flex items-center gap-1.5 bg-white border border-blue-200 rounded-lg px-2 py-1 flex-1">
                          <input
                            type="number" min={0} max={99}
                            value={offsetEdit.days}
                            onChange={(e) => setOffsetEdit((s) => ({ ...s, days: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-8 text-sm font-semibold text-center bg-transparent border-none outline-none"
                          />
                          <span className="text-xs text-gray-500">일</span>
                          <input
                            type="number" min={0} max={23}
                            value={offsetEdit.hours}
                            onChange={(e) => setOffsetEdit((s) => ({ ...s, hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) }))}
                            className="w-8 text-sm font-semibold text-center bg-transparent border-none outline-none"
                          />
                          <span className="text-xs text-gray-500">시간</span>
                          <input
                            type="number" min={0} max={59}
                            value={offsetEdit.mins}
                            onChange={(e) => setOffsetEdit((s) => ({ ...s, mins: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                            className="w-8 text-sm font-semibold text-center bg-transparent border-none outline-none"
                          />
                          <span className="text-xs text-gray-500">분</span>
                          <div className="flex rounded-md overflow-hidden border border-gray-200 ml-1">
                            {(["before", "after"] as const).map((d) => (
                              <button
                                key={d}
                                onClick={() => setOffsetEdit((s) => ({ ...s, dir: d }))}
                                className={`px-2 py-0.5 text-xs font-semibold transition-colors ${offsetEdit.dir === d ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                              >
                                {d === "before" ? "전" : "후"}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const newOffset = componentsToOffset(offsetEdit.days, offsetEdit.hours, offsetEdit.mins, offsetEdit.dir);
                              updateRule(idx, { offsetMinutes: newOffset });
                              setEditingOffsetIdx(null);
                            }}
                            className="ml-1 text-xs font-bold text-blue-600 hover:text-blue-800 px-1"
                          >✓</button>
                          <button
                            onClick={() => setEditingOffsetIdx(null)}
                            className="text-xs text-gray-400 hover:text-red-500 px-1"
                          >✕</button>
                        </div>
                      ) : (
                        /* ── Clickable label badge ─────────────── */
                        <button
                          onClick={() => {
                            const c = offsetToComponents(rule.offsetMinutes);
                            setOffsetEdit(c);
                            setEditingOffsetIdx(idx);
                          }}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full flex-none transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 ${rule.enabled ? "bg-blue-100 text-blue-700 hover:ring-blue-300" : "bg-gray-100 text-gray-500 hover:ring-gray-300"}`}
                          title="클릭하여 시간 편집"
                        >
                          {label} ✏
                        </button>
                      )}
                      {!isEditingOffset && defaultFireTime && (
                        <span className="text-xs text-gray-400">
                          {defaultFireTime.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className="text-xs text-gray-400">{rule.enabled ? "활성" : "비활성"}</span>
                      <Switch checked={rule.enabled} onCheckedChange={(checked) => updateRule(idx, { enabled: checked })} />
                    </div>
                  </div>

                  {/* Custom time picker */}
                  <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-gray-400 flex-none" />
                    <span className="text-xs text-gray-500 flex-none">발송 시각</span>
                    <input
                      type="time"
                      value={effectiveHHMM}
                      onChange={(e) => updateRule(idx, { customTime: e.target.value || null })}
                      className="flex-1 text-sm font-mono font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                    />
                    {rule.customTime ? (
                      <>
                        <span className="text-xs font-semibold text-blue-600 flex-none">커스텀</span>
                        <button
                          onClick={() => updateRule(idx, { customTime: null })}
                          className="text-xs text-gray-400 hover:text-red-500 flex-none"
                          title="기본값으로 초기화"
                        >
                          초기화
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 flex-none">자동</span>
                    )}
                  </div>

                  {/* Message type toggle */}
                  <div className="flex gap-2 mb-3">
                    {(["alimtalk", "sms"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => updateRule(idx, { messageType: type })}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold transition-colors ${rule.messageType === type ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-500 hover:border-blue-300"}`}
                      >
                        {type === "alimtalk" ? "🔔 알림톡" : "💬 문자"}
                      </button>
                    ))}
                  </div>

                  {/* Content input */}
                  {!isSms ? (
                    templates.length > 0 ? (
                      <Select
                        value={rule.templateId ?? ""}
                        onValueChange={(val) => {
                          const tpl = templates.find((t) => t.templateId === val);
                          updateRule(idx, { templateId: val || null, templateName: tpl?.name ?? null });
                        }}
                      >
                        <SelectTrigger className="rounded-lg border-gray-200 h-9 text-sm"><SelectValue placeholder="알림톡 템플릿 선택" /></SelectTrigger>
                        <SelectContent>{templates.map((t) => <SelectItem key={t.templateId} value={t.templateId}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Template ID 직접 입력"
                        value={rule.templateId ?? ""}
                        onChange={(e) => updateRule(idx, { templateId: e.target.value || null, templateName: null })}
                        className="rounded-lg border-gray-200 h-9 text-sm"
                      />
                    )
                  ) : (
                    <div className="space-y-1">
                      <Textarea
                        placeholder="발송할 문자 내용을 입력하세요..."
                        value={rule.messageBody ?? ""}
                        onChange={(e) => updateRule(idx, { messageBody: e.target.value || null })}
                        className="rounded-lg border-gray-200 text-sm resize-none min-h-[72px]"
                      />
                      <p className="text-xs text-gray-400 text-right">
                        {(rule.messageBody ?? "").length}자
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {templates.length === 0 && solapiConfig?.configured && !isLoadingRules && (
              <div className="flex justify-center pt-1">
                <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-sm" onClick={() => fetchTemplates(false)} disabled={isFetchingTemplates}>
                  {isFetchingTemplates ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}알림톡 템플릿 불러오기
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex-none border-t border-gray-100 pt-4">
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setRulesModal({ live: null, open: false })}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold" onClick={saveRules} disabled={isSavingRules}>
              {isSavingRules && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
