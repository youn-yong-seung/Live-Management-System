import { useState } from "react";
import { useGetLives, getGetLivesQueryKey, useCreateRegistration, getGetRegistrationsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Video, Calendar, Users } from "lucide-react";
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
    defaultValues: { name: "", phone: "", email: "", message: "" },
  });

  const onSubmit = (data: RegistrationFormValues) => {
    if (!selectedLiveId) return;
    createRegistration.mutate(
      { liveId: selectedLiveId, data },
      {
        onSuccess: () => {
          toast({ title: "신청 완료", description: "신청이 완료되었습니다! 카카오톡 알림톡이 발송됩니다." });
          setIsDialogOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey({ status: "scheduled" }) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          if (selectedLiveId) {
            queryClient.invalidateQueries({ queryKey: getGetRegistrationsQueryKey(selectedLiveId) });
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: "오류", description: "신청 중 문제가 발생했습니다. 다시 시도해주세요." });
        }
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setSelectedLiveId(null); form.reset(); }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">라이브 신청</h1>
        <p className="text-gray-500 text-sm">예정된 라이브 일정을 확인하고 참가 신청하세요. 신청 시 카카오 알림톡이 발송됩니다.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : lives && lives.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lives.map((live) => (
            <div key={live.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col">
              {live.thumbnailUrl ? (
                <div className="h-44 w-full bg-gray-50 overflow-hidden">
                  <img src={live.thumbnailUrl} alt={live.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-44 w-full bg-gray-50 flex items-center justify-center">
                  <Video className="h-10 w-10 text-gray-200" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(live.scheduledAt)}</span>
                </div>
                <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-2">{live.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-3 flex-1 mb-4">{live.description || "설명이 없습니다."}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    <span>신청자 {live.registrationCount}명</span>
                  </div>
                  <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    예정됨
                  </span>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                  onClick={() => { setSelectedLiveId(live.id); setIsDialogOpen(true); }}
                  data-testid={`btn-register-${live.id}`}
                >
                  참가 신청하기
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 py-20 text-center">
          <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-600 mb-1">예정된 라이브가 없습니다</p>
          <p className="text-sm text-gray-400">새 라이브 일정이 등록되면 이 곳에 표시됩니다.</p>
        </div>
      )}

      {/* Registration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">라이브 참가 신청</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              연락처를 남겨주시면 라이브 시작 전 알림톡을 보내드립니다.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">이름 <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" className="rounded-xl border-gray-200" {...field} data-testid="input-name" />
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
                    <FormLabel className="text-sm font-medium text-gray-700">연락처 <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="010-0000-0000" className="rounded-xl border-gray-200" {...field} data-testid="input-phone" />
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
                    <FormLabel className="text-sm font-medium text-gray-700">이메일 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" className="rounded-xl border-gray-200" {...field} data-testid="input-email" />
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
                    <FormLabel className="text-sm font-medium text-gray-700">사전 질문 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="라이브에서 다루었으면 하는 질문을 남겨주세요."
                        className="resize-none rounded-xl border-gray-200"
                        {...field}
                        data-testid="input-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                  disabled={createRegistration.isPending}
                  data-testid="btn-submit-registration"
                >
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
