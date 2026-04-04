import { useState } from "react";
import {
  useGetLives, getGetLivesQueryKey,
  useCreateLive, useUpdateLive, useDeleteLive,
  useGetRegistrations, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import type { Live, LiveStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import { Plus, Edit, Trash2, Users, Loader2, RefreshCw, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusConfig: Record<string, { label: string; className: string }> = {
  live: { label: "진행중", className: "bg-red-50 text-red-600" },
  scheduled: { label: "예정됨", className: "bg-blue-50 text-blue-600" },
  ended: { label: "종료됨", className: "bg-gray-100 text-gray-500" },
};

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [liveForm, setLiveForm] = useState<{
    id?: number;
    title: string;
    description: string;
    youtubeUrl: string;
    scheduledAt: string;
    status: LiveStatus;
    thumbnailUrl: string;
  }>({
    title: "", description: "", youtubeUrl: "", scheduledAt: "", status: "scheduled", thumbnailUrl: "",
  });

  const { data: lives, isLoading: isLivesLoading, refetch: refetchLives } = useGetLives(
    {},
    { query: { queryKey: getGetLivesQueryKey() } }
  );

  const { data: registrations, isLoading: isRegistrationsLoading } = useGetRegistrations(
    selectedLiveId || 0,
    { query: { queryKey: ["registrations", selectedLiveId], enabled: !!selectedLiveId && isRegistrationsModalOpen } }
  );

  const createLive = useCreateLive();
  const updateLive = useUpdateLive();
  const deleteLive = useDeleteLive();

  const handleOpenLiveModal = (live?: Live) => {
    if (live) {
      const scheduledAtDate = live.scheduledAt ? new Date(live.scheduledAt) : new Date();
      const localScheduledAt = new Date(scheduledAtDate.getTime() - scheduledAtDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setLiveForm({
        id: live.id, title: live.title, description: live.description || "",
        youtubeUrl: live.youtubeUrl || "", scheduledAt: live.scheduledAt ? localScheduledAt : "",
        status: live.status, thumbnailUrl: live.thumbnailUrl || "",
      });
    } else {
      setLiveForm({ title: "", description: "", youtubeUrl: "", scheduledAt: "", status: "scheduled", thumbnailUrl: "" });
    }
    setIsLiveModalOpen(true);
  };

  const handleSaveLive = async () => {
    if (!liveForm.title) {
      toast({ variant: "destructive", title: "오류", description: "제목을 입력해주세요." });
      return;
    }
    try {
      const liveData = {
        title: liveForm.title, description: liveForm.description || null,
        youtubeUrl: liveForm.youtubeUrl || null,
        scheduledAt: liveForm.scheduledAt ? new Date(liveForm.scheduledAt).toISOString() : null,
        status: liveForm.status, thumbnailUrl: liveForm.thumbnailUrl || null,
      };
      if (liveForm.id) {
        await updateLive.mutateAsync({ id: liveForm.id, data: liveData });
        toast({ title: "수정 완료", description: "라이브가 수정되었습니다." });
      } else {
        await createLive.mutateAsync({ data: liveData });
        toast({ title: "생성 완료", description: "새 라이브가 생성되었습니다." });
      }
      setIsLiveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "오류", description: "저장 중 문제가 발생했습니다." });
    }
  };

  const handleDeleteLive = async (id: number) => {
    if (!confirm("정말 이 라이브를 삭제하시겠습니까? 신청자 데이터도 함께 삭제될 수 있습니다.")) return;
    try {
      await deleteLive.mutateAsync({ id });
      toast({ title: "삭제 완료", description: "라이브가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "오류", description: "삭제 중 문제가 발생했습니다." });
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">관리자</h1>
          <p className="text-gray-500 text-sm">라이브 스트리밍을 관리하고 신청자 목록을 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-gray-200 text-gray-600"
            onClick={() => refetchLives()}
            disabled={isLivesLoading}
            data-testid="btn-refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLivesLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
            onClick={() => handleOpenLiveModal()}
            data-testid="btn-create-live"
          >
            <Plus className="mr-2 h-4 w-4" />
            라이브 생성
          </Button>
        </div>
      </div>

      {/* Live Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">라이브 목록</h2>
        </div>
        {isLivesLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
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
                    <TableCell>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${s.className}`}>
                        {s.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{live.title}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{formatDate(live.scheduledAt)}</TableCell>
                    <TableCell className="text-center">
                      <button
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={() => { setSelectedLiveId(live.id); setIsRegistrationsModalOpen(true); }}
                        data-testid={`btn-view-registrations-${live.id}`}
                      >
                        <Users className="h-4 w-4" />
                        {live.registrationCount}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200"
                          onClick={() => handleOpenLiveModal(live)}
                          data-testid={`btn-edit-live-${live.id}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200"
                          onClick={() => handleDeleteLive(live.id)}
                          data-testid={`btn-delete-live-${live.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <Settings className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">등록된 라이브가 없습니다</p>
          </div>
        )}
      </div>

      {/* Live Create/Edit Modal */}
      <Dialog open={isLiveModalOpen} onOpenChange={setIsLiveModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">{liveForm.id ? "라이브 수정" : "새 라이브 생성"}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">라이브 스트리밍의 상세 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">제목</Label>
              <Input id="title" value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} placeholder="라이브 제목을 입력하세요" className="rounded-xl border-gray-200" data-testid="input-live-title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">설명</Label>
              <Textarea id="description" value={liveForm.description} onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })} placeholder="라이브 설명을 입력하세요" className="rounded-xl border-gray-200 resize-none" data-testid="input-live-desc" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">상태</Label>
                <Select value={liveForm.status} onValueChange={(val: LiveStatus) => setLiveForm({ ...liveForm, status: val })}>
                  <SelectTrigger id="status" className="rounded-xl border-gray-200" data-testid="select-live-status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">예정됨</SelectItem>
                    <SelectItem value="live">진행중</SelectItem>
                    <SelectItem value="ended">종료됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledAt" className="text-sm font-medium text-gray-700">예정 일시</Label>
                <Input id="scheduledAt" type="datetime-local" value={liveForm.scheduledAt} onChange={(e) => setLiveForm({ ...liveForm, scheduledAt: e.target.value })} className="rounded-xl border-gray-200" data-testid="input-live-date" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="youtubeUrl" className="text-sm font-medium text-gray-700">YouTube URL</Label>
              <Input id="youtubeUrl" value={liveForm.youtubeUrl} onChange={(e) => setLiveForm({ ...liveForm, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="rounded-xl border-gray-200" data-testid="input-live-youtube" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="thumbnailUrl" className="text-sm font-medium text-gray-700">썸네일 URL</Label>
              <Input id="thumbnailUrl" value={liveForm.thumbnailUrl} onChange={(e) => setLiveForm({ ...liveForm, thumbnailUrl: e.target.value })} placeholder="https://example.com/image.jpg" className="rounded-xl border-gray-200" data-testid="input-live-thumbnail" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setIsLiveModalOpen(false)}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold" onClick={handleSaveLive} disabled={createLive.isPending || updateLive.isPending} data-testid="btn-save-live">
              {(createLive.isPending || updateLive.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrations Modal */}
      <Dialog open={isRegistrationsModalOpen} onOpenChange={setIsRegistrationsModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-none">
            <DialogTitle className="text-lg font-bold text-gray-900">신청자 목록</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">이 라이브에 등록된 모든 신청자 정보입니다.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {isRegistrationsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : registrations && registrations.length > 0 ? (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-gray-500 font-medium text-xs">이름</TableHead>
                      <TableHead className="text-gray-500 font-medium text-xs">연락처</TableHead>
                      <TableHead className="text-gray-500 font-medium text-xs">이메일</TableHead>
                      <TableHead className="text-gray-500 font-medium text-xs">신청일시</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-900">
                          {reg.name}
                          {reg.message && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]" title={reg.message}>Q: {reg.message}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">{reg.phone}</TableCell>
                        <TableCell className="text-gray-600 text-sm">{reg.email || "—"}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{formatDate(reg.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <Users className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">아직 신청자가 없습니다</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-none pt-4 border-t border-gray-100 mt-4">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold" onClick={() => setIsRegistrationsModalOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
