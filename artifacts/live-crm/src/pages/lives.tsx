import { useState } from "react";
import { useGetLives, getGetLivesQueryKey, useCreateRegistration, getGetRegistrationsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Video, Calendar, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const registrationSchema = z.object({
  name: z.string().min(2, "이름을 입력해주세요"),
  phone: z.string().min(10, "연락처를 정확히 입력해주세요"),
  email: z.string().email("이메일 형식이 올바르지 않습니다").optional().or(z.literal("")),
  message: z.string().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export default function Lives() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: lives, isLoading } = useGetLives(
    { status: "scheduled" },
    { query: { queryKey: getGetLivesQueryKey({ status: "scheduled" }) } }
  );

  const createRegistration = useCreateRegistration();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = (data: RegistrationFormValues) => {
    if (!selectedLiveId) return;

    createRegistration.mutate(
      { liveId: selectedLiveId, data },
      {
        onSuccess: () => {
          toast({
            title: "신청 완료",
            description: "신청이 완료되었습니다! 카카오톡 알림톡이 발송됩니다.",
          });
          setIsDialogOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey({ status: "scheduled" }) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          if (selectedLiveId) {
            queryClient.invalidateQueries({ queryKey: getGetRegistrationsQueryKey(selectedLiveId) });
          }
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "오류",
            description: "신청 중 문제가 발생했습니다. 다시 시도해주세요.",
          });
        }
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedLiveId(null);
      form.reset();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">라이브 신청</h1>
        <p className="text-muted-foreground">예정된 라이브 스트리밍 일정을 확인하고 신청하세요.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card">
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lives && lives.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lives.map((live) => (
            <Card key={live.id} className="bg-card flex flex-col overflow-hidden">
              {live.thumbnailUrl ? (
                <div className="h-48 w-full bg-muted overflow-hidden">
                  <img src={live.thumbnailUrl} alt={live.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                </div>
              ) : (
                <div className="h-48 w-full bg-muted flex items-center justify-center">
                  <Video className="h-12 w-12 text-muted-foreground opacity-20" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(live.scheduledAt)}</span>
                </div>
                <CardTitle className="line-clamp-2 leading-tight">{live.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">{live.description || "설명이 없습니다."}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>현재 신청자: {live.registrationCount}명</span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border bg-card/50">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setSelectedLiveId(live.id);
                    setIsDialogOpen(true);
                  }}
                  data-testid={`btn-register-${live.id}`}
                >
                  참가 신청하기
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">예정된 라이브가 없습니다</h3>
            <p className="text-muted-foreground">새로운 라이브 일정이 등록되면 여기에 표시됩니다.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>라이브 참가 신청</DialogTitle>
            <DialogDescription>
              연락처를 남겨주시면 라이브 시작 전 알림톡을 보내드립니다.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="010-0000-0000" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 (선택)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사전 질문 / 메시지 (선택)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="라이브에서 다루었으면 하는 질문을 남겨주세요." 
                        className="resize-none" 
                        {...field} 
                        data-testid="input-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={createRegistration.isPending} data-testid="btn-submit-registration">
                  {createRegistration.isPending ? "신청 중..." : "신청 완료"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
