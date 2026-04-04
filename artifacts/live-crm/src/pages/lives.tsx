import { useState, useEffect } from "react";
import { useGetLives, getGetLivesQueryKey, useCreateRegistration, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

/* ── Constants ──────────────────────────────────────── */

const INDUSTRIES = [
  "제조업", "도소매업", "음식점/카페", "서비스업", "교육",
  "IT/소프트웨어", "의료/헬스케어", "부동산", "금융",
  "프리랜서/1인 기업", "기타",
];

const CHANNELS = [
  "유튜브", "인스타그램", "네이버 블로그", "지인 추천",
  "카카오채널", "구글 검색", "기타",
];

const SKILL_LEVELS = [
  { value: "beginner", label: "초보 (처음 시작)" },
  { value: "intermediate", label: "중급 (기초 알고 있음)" },
  { value: "advanced", label: "고급 (어느 정도 활용 가능)" },
];

/* ── Types ──────────────────────────────────────────── */

interface CustomQuestion {
  id: number;
  question: string;
  questionType: string;
  options: string[] | null;
  displayOrder: number;
}

/* ── Form schema ─────────────────────────────────────── */

const registrationSchema = z.object({
  name: z.string().min(2, "이름을 입력해주세요"),
  phone: z.string().min(10, "연락처를 정확히 입력해주세요"),
  email: z.string().email("이메일 형식이 올바르지 않습니다").optional().or(z.literal("")),
  message: z.string().optional(),
  industry: z.string().optional(),
  channelSource: z.array(z.string()).optional(),
  skillLevel: z.string().optional(),
  customAnswers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

/* ── Main component ─────────────────────────────────── */

export default function Lives() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const { data: lives, isLoading } = useGetLives(
    { status: "scheduled" },
    { query: { queryKey: getGetLivesQueryKey({ status: "scheduled" }) } }
  );

  const createRegistration = useCreateRegistration();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", phone: "", email: "", message: "", industry: "", channelSource: [], skillLevel: "", customAnswers: {} },
  });

  /* ── Load custom questions when dialog opens ─── */
  useEffect(() => {
    if (!isDialogOpen || !selectedLiveId) { setCustomQuestions([]); return; }
    setIsLoadingQuestions(true);
    fetch(`/api/lives/${selectedLiveId}/custom-questions`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<CustomQuestion[]>; })
      .then((qs) => Array.isArray(qs) ? setCustomQuestions(qs) : setCustomQuestions([]))
      .catch(() => setCustomQuestions([]))
      .finally(() => setIsLoadingQuestions(false));
  }, [isDialogOpen, selectedLiveId]);

  const hasSkillLevel = customQuestions.some((q) => q.questionType === "skill_level");
  const dynamicQuestions = customQuestions.filter((q) => q.questionType !== "skill_level");

  const onSubmit = (data: RegistrationFormValues) => {
    if (!selectedLiveId) return;
    createRegistration.mutate(
      {
        liveId: selectedLiveId,
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          message: data.message || null,
          industry: data.industry || null,
          channelSource: data.channelSource?.length ? data.channelSource : null,
          skillLevel: data.skillLevel || null,
          customAnswers: data.customAnswers && Object.keys(data.customAnswers).length ? data.customAnswers : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "신청 완료", description: "신청이 완료되었습니다! 카카오톡 알림톡이 발송됩니다." });
          setIsDialogOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetLivesQueryKey({ status: "scheduled" }) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
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
    <div className="space-y-10">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white mb-1">라이브 신청</h1>
        <p className="text-white/50 text-sm">예정된 라이브 일정을 확인하고 참가 신청하세요. 신청 시 카카오 알림톡이 발송됩니다.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card overflow-hidden">
              <Skeleton className="h-44 w-full bg-white/5" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4 bg-white/5" />
                <Skeleton className="h-4 w-1/2 bg-white/5" />
                <Skeleton className="h-10 w-full rounded-xl bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : lives && lives.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lives.map((live) => (
            <div key={live.id} className="glass-card hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
              {live.thumbnailUrl ? (
                <div className="h-44 w-full bg-black/30 overflow-hidden">
                  <img src={live.thumbnailUrl} alt={live.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-44 w-full bg-black/20 flex items-center justify-center">
                  <Video className="h-10 w-10 text-white/20" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 text-xs text-[#CC9965] font-medium mb-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(live.scheduledAt)}</span>
                </div>
                <h3 className="font-bold text-white leading-snug line-clamp-2 mb-2">{live.title}</h3>
                <p className="text-sm text-white/50 line-clamp-3 flex-1 mb-4">{live.description || "설명이 없습니다."}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/30">
                    <Users className="h-3.5 w-3.5" />
                    <span>신청자 {live.registrationCount}명</span>
                  </div>
                  <span className="inline-block bg-[#CC9965]/15 text-[#CC9965] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#CC9965]/20">예정됨</span>
                </div>
                <Button
                  className="w-full bg-[#CC9965] hover:bg-[#d4a570] text-black font-bold rounded-xl gold-glow"
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
        <div className="glass-card py-20 text-center">
          <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-white/20" />
          </div>
          <p className="font-semibold text-white/60 mb-1">예정된 라이브가 없습니다</p>
          <p className="text-sm text-white/30">새 라이브 일정이 등록되면 이 곳에 표시됩니다.</p>
        </div>
      )}

      {/* Registration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px] bg-white rounded-2xl border border-gray-100 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">라이브 참가 신청</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              연락처를 남겨주시면 라이브 시작 전 알림톡을 보내드립니다.
            </DialogDescription>
          </DialogHeader>

          {isLoadingQuestions ? (
            <div className="py-6 space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

                {/* ── 이름 */}
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">이름 <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="홍길동" className="rounded-xl border-gray-200" {...field} data-testid="input-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── 연락처 */}
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">연락처 <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="010-0000-0000" className="rounded-xl border-gray-200" {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── 이메일 */}
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">이메일 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <FormControl><Input type="email" placeholder="example@email.com" className="rounded-xl border-gray-200" {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── 업종 */}
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">업종 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200">
                          <SelectValue placeholder="업종을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── 어디서 알게 됐나요 */}
                <FormField control={form.control} name="channelSource" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">어디서 알게 됐나요? <span className="text-gray-400 font-normal">(복수 선택)</span></FormLabel>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {CHANNELS.map((ch) => {
                        const checked = (field.value as string[] | undefined)?.includes(ch) ?? false;
                        return (
                          <div key={ch} className="flex items-center gap-2">
                            <Checkbox
                              id={`ch-${ch}`}
                              checked={checked}
                              onCheckedChange={(v) => {
                                const current = (field.value as string[] | undefined) ?? [];
                                field.onChange(v ? [...current, ch] : current.filter((c) => c !== ch));
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`ch-${ch}`} className="text-sm text-gray-700 cursor-pointer">{ch}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </FormItem>
                )} />

                {/* ── 수준 (only if live has skill_level question) */}
                {hasSkillLevel && (
                  <FormField control={form.control} name="skillLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">AI/툴 활용 수준 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="pt-1 space-y-2">
                        {SKILL_LEVELS.map((sl) => (
                          <div key={sl.value} className="flex items-center gap-2">
                            <RadioGroupItem value={sl.value} id={`sl-${sl.value}`} />
                            <Label htmlFor={`sl-${sl.value}`} className="text-sm text-gray-700 cursor-pointer">{sl.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormItem>
                  )} />
                )}

                {/* ── Dynamic custom questions */}
                {dynamicQuestions.map((q) => (
                  <FormField
                    key={q.id}
                    control={form.control}
                    name={`customAnswers.${q.id}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">{q.question} <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                        {(q.questionType === "text" || q.questionType === "textarea") && (
                          <FormControl>
                            <Textarea
                              className="resize-none rounded-xl border-gray-200 text-sm"
                              placeholder="답변을 입력해주세요"
                              rows={q.questionType === "textarea" ? 4 : 2}
                              value={typeof field.value === "string" ? field.value : ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                        )}
                        {q.questionType === "radio" && q.options && (
                          <RadioGroup onValueChange={field.onChange} value={typeof field.value === "string" ? field.value : ""} className="pt-1 space-y-2">
                            {q.options.map((opt) => (
                              <div key={opt} className="flex items-center gap-2">
                                <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} />
                                <Label htmlFor={`q${q.id}-${opt}`} className="text-sm text-gray-700 cursor-pointer">{opt}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        {q.questionType === "checkbox" && q.options && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt) => {
                              const vals = Array.isArray(field.value) ? field.value : [];
                              return (
                                <div key={opt} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`q${q.id}-${opt}`}
                                    checked={vals.includes(opt)}
                                    onCheckedChange={(v) => field.onChange(v ? [...vals, opt] : vals.filter((x) => x !== opt))}
                                    className="rounded border-gray-300"
                                  />
                                  <Label htmlFor={`q${q.id}-${opt}`} className="text-sm text-gray-700 cursor-pointer">{opt}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                ))}

                {/* ── 사전 질문 */}
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">사전 질문 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="라이브에서 다루었으면 하는 질문을 남겨주세요." className="resize-none rounded-xl border-gray-200" {...field} data-testid="input-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleOpenChange(false)}>취소</Button>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
