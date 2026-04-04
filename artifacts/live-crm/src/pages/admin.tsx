import { useState } from "react";
import { 
  useGetLives, getGetLivesQueryKey,
  useCreateLive, useUpdateLive, useDeleteLive,
  useGetRegistrations, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import type { Live, LiveStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import { Settings, Plus, Edit, Trash2, Users, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    title: "",
    description: "",
    youtubeUrl: "",
    scheduledAt: "",
    status: "scheduled",
    thumbnailUrl: "",
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
      // Date formatting for input type="datetime-local"
      const scheduledAtDate = live.scheduledAt ? new Date(live.scheduledAt) : new Date();
      // Adjust to local time string format for datetime-local: YYYY-MM-DDTHH:mm
      const localScheduledAt = new Date(scheduledAtDate.getTime() - scheduledAtDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      setLiveForm({
        id: live.id,
        title: live.title,
        description: live.description || "",
        youtubeUrl: live.youtubeUrl || "",
        scheduledAt: live.scheduledAt ? localScheduledAt : "",
        status: live.status,
        thumbnailUrl: live.thumbnailUrl || "",
      });
    } else {
      setLiveForm({
        title: "",
        description: "",
        youtubeUrl: "",
        scheduledAt: "",
        status: "scheduled",
        thumbnailUrl: "",
      });
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
        title: liveForm.title,
        description: liveForm.description || null,
        youtubeUrl: liveForm.youtubeUrl || null,
        scheduledAt: liveForm.scheduledAt ? new Date(liveForm.scheduledAt).toISOString() : null,
        status: liveForm.status,
        thumbnailUrl: liveForm.thumbnailUrl || null,
      };

      if (liveForm.id) {
        await updateLive.mutateAsync({ id: liveForm.id, data: liveData });
        toast({ title: "성공", description: "라이브가 수정되었습니다." });
      } else {
        await createLive.mutateAsync({ data: liveData });
        toast({ title: "성공", description: "새로운 라이브가 생성되었습니다." });
      }
      
      setIsLiveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch (e) {
      toast({ variant: "destructive", title: "오류", description: "저장 중 문제가 발생했습니다." });
    }
  };

  const handleDeleteLive = async (id: number) => {
    if (!confirm("정말 이 라이브를 삭제하시겠습니까? 신청자 데이터도 함께 삭제될 수 있습니다.")) return;
    
    try {
      await deleteLive.mutateAsync({ id });
      toast({ title: "성공", description: "라이브가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch (e) {
      toast({ variant: "destructive", title: "오류", description: "삭제 중 문제가 발생했습니다." });
    }
  };

  const handleViewRegistrations = (id: number) => {
    setSelectedLiveId(id);
    setIsRegistrationsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "live": return <Badge variant="destructive" className="animate-pulse">진행중</Badge>;
      case "scheduled": return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-blue-500/20">예정됨</Badge>;
      case "ended": return <Badge variant="outline" className="text-muted-foreground">종료됨</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">관리자</h1>
          <p className="text-muted-foreground">라이브 스트리밍을 관리하고 신청자 목록을 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchLives()} disabled={isLivesLoading} data-testid="btn-refresh">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLivesLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={() => handleOpenLiveModal()} data-testid="btn-create-live">
            <Plus className="mr-2 h-4 w-4" />
            라이브 생성
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>라이브 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLivesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : lives && lives.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>상태</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>예정일시</TableHead>
                    <TableHead className="text-center">신청자</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lives.map((live) => (
                    <TableRow key={live.id}>
                      <TableCell>{getStatusBadge(live.status)}</TableCell>
                      <TableCell className="font-medium">{live.title}</TableCell>
                      <TableCell>{formatDate(live.scheduledAt)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewRegistrations(live.id)}
                          data-testid={`btn-view-registrations-${live.id}`}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          {live.registrationCount}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleOpenLiveModal(live)}
                            data-testid={`btn-edit-live-${live.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => handleDeleteLive(live.id)}
                            data-testid={`btn-delete-live-${live.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <Settings className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p>등록된 라이브가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Create/Edit Modal */}
      <Dialog open={isLiveModalOpen} onOpenChange={setIsLiveModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card">
          <DialogHeader>
            <DialogTitle>{liveForm.id ? "라이브 수정" : "새 라이브 생성"}</DialogTitle>
            <DialogDescription>
              라이브 스트리밍의 상세 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">제목</Label>
              <Input 
                id="title" 
                value={liveForm.title} 
                onChange={(e) => setLiveForm({...liveForm, title: e.target.value})} 
                placeholder="라이브 제목을 입력하세요"
                data-testid="input-live-title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              <Textarea 
                id="description" 
                value={liveForm.description} 
                onChange={(e) => setLiveForm({...liveForm, description: e.target.value})} 
                placeholder="라이브 설명을 입력하세요"
                data-testid="input-live-desc"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">상태</Label>
                <Select 
                  value={liveForm.status} 
                  onValueChange={(val: LiveStatus) => setLiveForm({...liveForm, status: val})}
                >
                  <SelectTrigger id="status" data-testid="select-live-status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">예정됨 (Scheduled)</SelectItem>
                    <SelectItem value="live">진행중 (Live)</SelectItem>
                    <SelectItem value="ended">종료됨 (Ended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledAt">예정 일시</Label>
                <Input 
                  id="scheduledAt" 
                  type="datetime-local" 
                  value={liveForm.scheduledAt} 
                  onChange={(e) => setLiveForm({...liveForm, scheduledAt: e.target.value})}
                  data-testid="input-live-date"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input 
                id="youtubeUrl" 
                value={liveForm.youtubeUrl} 
                onChange={(e) => setLiveForm({...liveForm, youtubeUrl: e.target.value})} 
                placeholder="https://youtube.com/watch?v=..."
                data-testid="input-live-youtube"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="thumbnailUrl">썸네일 URL</Label>
              <Input 
                id="thumbnailUrl" 
                value={liveForm.thumbnailUrl} 
                onChange={(e) => setLiveForm({...liveForm, thumbnailUrl: e.target.value})} 
                placeholder="https://example.com/image.jpg"
                data-testid="input-live-thumbnail"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLiveModalOpen(false)}>취소</Button>
            <Button 
              onClick={handleSaveLive} 
              disabled={createLive.isPending || updateLive.isPending}
              data-testid="btn-save-live"
            >
              {(createLive.isPending || updateLive.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrations Modal */}
      <Dialog open={isRegistrationsModalOpen} onOpenChange={setIsRegistrationsModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-card max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-none">
            <DialogTitle>신청자 목록</DialogTitle>
            <DialogDescription>
              이 라이브에 등록된 모든 신청자 정보입니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {isRegistrationsLoading ? (
              <div className="space-y-4 flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : registrations && registrations.length > 0 ? (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>신청일시</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">
                          {reg.name}
                          {reg.message && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 truncate max-w-[150px]" title={reg.message}>
                              Q: {reg.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{reg.phone}</TableCell>
                        <TableCell>{reg.email || "-"}</TableCell>
                        <TableCell>{formatDate(reg.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>아직 신청자가 없습니다.</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-none pt-4 border-t border-border mt-4">
            <Button onClick={() => setIsRegistrationsModalOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
