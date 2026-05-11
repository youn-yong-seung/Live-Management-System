import { useState, useEffect } from "react";
import { useGetLives, getGetLivesQueryKey, useCreateRegistration, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Video, Calendar, Users, PlayCircle, Star, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { ReplayModal } from "@/components/replay-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChannelSourceField, type ChannelSourceItem } from "@/components/channel-source-field";

/* ── Constants ──────────────────────────────────────── */

const INDUSTRIES = [
  "제조업", "도소매업", "음식점/카페", "서비스업", "교육",
  "IT/소프트웨어", "의료/헬스케어", "부동산", "금융",
  "프리랜서/1인 기업", "직접 입력",
];

// 마스터 채널 fetch가 실패했을 때만 쓰는 fallback.
const CHANNELS: ChannelSourceItem[] = [
  { name: "유튜브", category: "유튜브" },
  { name: "인스타", category: "인스타" },
  { name: "스레드", category: "스레드" },
  { name: "오픈채팅방", category: "오픈채팅방" },
  { name: "지인 추천", category: "지인 추천" },
  { name: "검색", category: "검색" },
  { name: "직접 입력", category: null },
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

interface FormConfig {
  showEmail: boolean;
  showIndustry: boolean;
  showChannelSource: boolean;
  showSkillLevel: boolean;
  showMessage: boolean;
  showMarketingConsent: boolean;
  channelSourceOptions: string[] | null;
  industryOptions: string[] | null;
  aiRecommendedQuestions: { question: string; questionType: string; options?: string[] }[] | null;
}

/* ── Form schema ─────────────────────────────────────── */

const registrationSchema = z.object({
  name: z.string().min(2, "이름을 입력해주세요"),
  phone: z.string().min(10, "연락처를 정확히 입력해주세요"),
  email: z.string().email("이메일 형식이 올바르지 않습니다").optional().or(z.literal("")),
  message: z.string().optional(),
  industry: z.string().optional(),
  industryCustom: z.string().optional(),
  channelSource: z.array(z.string()).optional(),
  channelSourceCustom: z.string().optional(),
  skillLevel: z.string().optional(),
  customAnswers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

/* ── Main component ─────────────────────────────────── */

export default function Lives() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [modalReplay, setModalReplay] = useState<any>(null);
  const queryClient = useQueryClient();
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [masterSources, setMasterSources] = useState<ChannelSourceItem[]>([]);

  const { data: lives, isLoading } = useGetLives(
    { status: "scheduled" },
    { query: { queryKey: getGetLivesQueryKey({ status: "scheduled" }) } }
  );

  const { data: activeLives } = useGetLives(
    { status: "live" },
    { query: { queryKey: getGetLivesQueryKey({ status: "live" }) } }
  );

  const createRegistration = useCreateRegistration();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", phone: "", email: "", message: "", industry: "", industryCustom: "", channelSource: [], channelSourceCustom: "", skillLevel: "", customAnswers: {} },
  });

  /* ── Load custom questions + form config when dialog opens ─── */
  useEffect(() => {
    if (!isDialogOpen || !selectedLiveId) { setCustomQuestions([]); setFormConfig(null); return; }
    setIsLoadingQuestions(true);
    Promise.all([
      fetch(`/api/lives/${selectedLiveId}/custom-questions`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/lives/${selectedLiveId}/form-config`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/channel-sources`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([qs, fc, channels]) => {
        setCustomQuestions(Array.isArray(qs) ? qs : []);
        setFormConfig(fc);
        if (Array.isArray(channels)) {
          setMasterSources(channels.map((c: any) => ({ name: c.name, category: c.category ?? null })));
        }
      })
      .catch(() => { setCustomQuestions([]); setFormConfig(null); })
      .finally(() => setIsLoadingQuestions(false));
  }, [isDialogOpen, selectedLiveId]);

  const fc = formConfig;
  const showEmail = fc?.showEmail ?? true;
  const showIndustry = fc?.showIndustry ?? true;
  const showChannelSource = fc?.showChannelSource ?? true;
  const showSkillLevel = fc?.showSkillLevel ?? false;
  const showMessage = fc?.showMessage ?? true;
  const activeSources: ChannelSourceItem[] = (() => {
    if (fc?.channelSourceOptions && fc.channelSourceOptions.length > 0) {
      return fc.channelSourceOptions.map((name) => {
        const hit = masterSources.find((s) => s.name === name);
        return hit ?? { name, category: null };
      });
    }
    if (masterSources.length > 0) return masterSources;
    return CHANNELS;
  })();
  const activeIndustries = fc?.industryOptions ?? INDUSTRIES;
  const aiQuestions = fc?.aiRecommendedQuestions ?? [];

  const hasSkillLevel = showSkillLevel || customQuestions.some((q) => q.questionType === "skill_level");
  const dynamicQuestions = customQuestions.filter((q) => q.questionType !== "skill_level");

  const onSubmit = (data: RegistrationFormValues) => {
    if (!selectedLiveId) return;
    // Handle "직접 입력" custom values
    const industry = (data.industry === "직접 입력" || data.industry === "기타") && data.industryCustom
      ? data.industryCustom : data.industry || null;
    const channels = data.channelSource?.map((ch) =>
      (ch === "직접 입력" || ch === "기타") && data.channelSourceCustom ? data.channelSourceCustom : ch
    );
    createRegistration.mutate(
      {
        liveId: selectedLiveId,
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          message: data.message || null,
          industry,
          channelSource: channels?.length ? channels : null,
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

  /* ── 직관적 날짜 라벨 ──────────────────── */
  function relativeDateLabel(iso: string | null | undefined): { label: string; tone: "today" | "soon" | "thisweek" | "nextweek" | "later" | "past" } {
    if (!iso) return { label: "일정 미정", tone: "later" };
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((target.getTime() - startOfToday.getTime()) / 86400000);
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const wd = weekdays[d.getDay()];

    if (diffDays < 0) return { label: "지난 라이브", tone: "past" };
    if (diffDays === 0) return { label: "오늘", tone: "today" };
    if (diffDays === 1) return { label: "내일", tone: "today" };
    if (diffDays === 2) return { label: "모레", tone: "today" };

    const todayDow = now.getDay(); // 0=일
    const daysToEndOfThisWeek = 6 - todayDow;
    if (diffDays <= daysToEndOfThisWeek) return { label: `이번 주 ${wd}`, tone: "thisweek" };
    if (diffDays <= daysToEndOfThisWeek + 7) return { label: `다음 주 ${wd}`, tone: "nextweek" };
    if (diffDays <= 21) return { label: `${Math.ceil(diffDays / 7)}주 후`, tone: "later" };
    return { label: format(d, "M월 d일 (E)", { locale: ko }), tone: "later" };
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-[#111318] mb-1">라이브 신청</h1>
        <p className="text-[#8b8f98] text-sm">예정된 라이브 일정을 확인하고 참가 신청하세요. 신청 시 카카오 알림톡이 발송됩니다.</p>
      </div>

      {/* ── Live Now ─────────────────────────────── */}
      {activeLives && activeLives.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#111318] flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            지금 라이브 중
          </h2>
          {activeLives.map((live) => (
            <div key={live.id} className="glass-card-gold hover:-translate-y-1 transition-all duration-300 p-6">
              <div className="cursor-pointer" onClick={() => setModalReplay(live)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wide">LIVE NOW</span>
                  <span className="text-xs text-[#a0a4ab]">{live.registrationCount}명 참석</span>
                </div>
                <h3 className="font-bold text-[#111318] hover:text-[#6366F1] transition-colors mb-1">{live.title}</h3>
                <p className="text-sm text-[#8b8f98] line-clamp-2 mb-3">{live.description}</p>
              </div>
              <div className="flex gap-2 pt-3 border-t border-[#eef0f3]">
                {live.youtubeUrl && (
                  <a href={live.youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-[#111318] text-xs font-bold py-2.5 rounded-lg transition-colors">
                    <PlayCircle className="h-3.5 w-3.5" /> 라이브 입장하기
                  </a>
                )}
                <button
                  className="flex-1 flex items-center justify-center gap-2 border border-[#e5e7eb] text-[#484d57] hover:text-[#6366F1] hover:border-[#6366F1]/30 text-xs font-bold py-2.5 rounded-lg transition-colors"
                  onClick={() => setModalReplay(live)}>
                  <Star className="h-3.5 w-3.5" /> 후기 작성하기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card overflow-hidden">
              <Skeleton className="h-44 w-full bg-[#f7f8fa]" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4 bg-[#f7f8fa]" />
                <Skeleton className="h-4 w-1/2 bg-[#f7f8fa]" />
                <Skeleton className="h-10 w-full rounded-xl bg-[#f7f8fa]" />
              </div>
            </div>
          ))}
        </div>
      ) : lives && lives.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lives.map((live) => (
            <div key={live.id} className="glass-card hover:bg-[#eef0f3] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
              {(() => {
                const ytId = live.youtubeUrl
                  ? live.youtubeUrl.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/)?.[1]
                  : null;
                const thumb = live.thumbnailUrl ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
                return thumb ? (
                  <div className="h-44 w-full bg-[#f7f8fa] overflow-hidden">
                    <img src={thumb} alt={live.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-44 w-full bg-[#f7f8fa] flex items-center justify-center">
                    <Video className="h-10 w-10 text-[#d1d5db]" />
                  </div>
                );
              })()}
              <div className="p-5 flex flex-col flex-1">
                {(() => {
                  const rel = relativeDateLabel(live.scheduledAt);
                  const toneStyles: Record<typeof rel.tone, string> = {
                    today: "bg-rose-50 text-rose-700 border-rose-200",
                    soon: "bg-rose-50 text-rose-700 border-rose-200",
                    thisweek: "bg-[#eef2ff] text-[#6366F1] border-[#c7d2fe]",
                    nextweek: "bg-[#f7f8fa] text-[#484d57] border-[#e5e7eb]",
                    later: "bg-[#f7f8fa] text-[#8b8f98] border-[#e5e7eb]",
                    past: "bg-[#f7f8fa] text-[#a0a4ab] border-[#e5e7eb]",
                  };
                  return (
                    <span className={`self-start inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border mb-3 ${toneStyles[rel.tone]}`}>
                      <Calendar className="h-3 w-3" />
                      {rel.label}
                    </span>
                  );
                })()}
                <div className="flex items-center gap-1.5 text-xs text-[#8b8f98] mb-2">
                  <span>{formatDate(live.scheduledAt)}</span>
                </div>
                <h3 className="font-bold text-[#111318] leading-snug line-clamp-2 mb-2">{live.title}</h3>
                <p className="text-sm text-[#8b8f98] line-clamp-3 flex-1 mb-4">{live.description || "설명이 없습니다."}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-[#a0a4ab]">
                    <Users className="h-3.5 w-3.5" />
                    <span>신청자 {live.registrationCount}명</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#6366F1] hover:bg-[#818CF8] text-black font-bold rounded-xl gold-glow"
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
          <div className="w-14 h-14 bg-[#f7f8fa] rounded-2xl border border-[#e5e7eb] flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-[#d1d5db]" />
          </div>
          <p className="font-semibold text-[#484d57] mb-1">예정된 라이브가 없습니다</p>
          <p className="text-sm text-[#a0a4ab]">새 라이브 일정이 등록되면 이 곳에 표시됩니다.</p>
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
                    <FormControl><Input placeholder="홍길동" className="rounded-xl border-gray-200 !text-black" {...field} data-testid="input-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── 연락처 */}
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">연락처 <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="010-0000-0000" className="rounded-xl border-gray-200 !text-black" {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── 이메일 */}
                {showEmail && (
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">이메일 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <FormControl><Input type="email" placeholder="example@email.com" className="rounded-xl border-gray-200 !text-black" {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                )}

                {/* ── 업종 */}
                {showIndustry && (
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">업종 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200 !text-black">
                          <SelectValue placeholder="업종을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeIndustries.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(field.value === "직접 입력" || field.value === "기타") && (
                      <Input placeholder="업종을 직접 입력해주세요" className="mt-2 !rounded-xl !border-gray-200 !text-black" {...form.register("industryCustom")} />
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                )}

                {/* ── 어디서 보고 오셨나요 */}
                {showChannelSource && (
                <FormField control={form.control} name="channelSource" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">어디서 보고 오셨나요? <span className="text-red-500">*</span></FormLabel>
                    <ChannelSourceField
                      sources={activeSources}
                      value={(field.value as string[] | undefined)?.[0]}
                      onChange={(v) => field.onChange(v ? [v] : [])}
                      customValue={form.watch("channelSourceCustom") ?? ""}
                      onCustomChange={(v) => form.setValue("channelSourceCustom", v)}
                      theme="light"
                      idPrefix="ch"
                    />
                  </FormItem>
                )} />
                )}

                {/* ── AI 추천 질문 (form-config) */}
                {aiQuestions.map((q, qi) => (
                  <FormField
                    key={`ai-${qi}`}
                    control={form.control}
                    name={`customAnswers.ai_${qi}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">{q.question}</FormLabel>
                        {q.questionType === "radio" && q.options && (() => {
                          const val = typeof field.value === "string" ? field.value : "";
                          const isCustom = val === "기타" || val === "직접 입력" || val.startsWith("기타(") || val.startsWith("직접 입력(");
                          return (
                            <>
                              <RadioGroup onValueChange={field.onChange} value={val} className="pt-1 space-y-2">
                                {q.options.map((opt) => (
                                  <div key={opt} className="flex items-center gap-2">
                                    <RadioGroupItem value={opt} id={`ai${qi}-${opt}`} />
                                    <Label htmlFor={`ai${qi}-${opt}`} className="text-sm text-gray-700 cursor-pointer">{opt}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                              {isCustom && (
                                <Input placeholder="직접 입력해주세요" className="mt-2 !rounded-xl !border-gray-200 !text-black"
                                  onChange={(e) => field.onChange(e.target.value ? `직접 입력: ${e.target.value}` : val)} />
                              )}
                            </>
                          );
                        })()}
                        {q.questionType === "checkbox" && q.options && (() => {
                          const vals = Array.isArray(field.value) ? field.value : [];
                          const hasCustom = vals.some((v) => v === "기타" || v === "직접 입력" || v.startsWith("기타(") || v.startsWith("직접 입력("));
                          return (
                            <>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt) => (
                                  <div key={opt} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`ai${qi}-${opt}`}
                                      checked={vals.includes(opt)}
                                      onCheckedChange={(v) => field.onChange(v ? [...vals, opt] : vals.filter((x) => x !== opt))}
                                      className="rounded border-gray-300"
                                    />
                                    <Label htmlFor={`ai${qi}-${opt}`} className="text-sm text-gray-700 cursor-pointer">{opt}</Label>
                                  </div>
                                ))}
                              </div>
                              {hasCustom && (
                                <Input placeholder="직접 입력해주세요" className="mt-2 !rounded-xl !border-gray-200 !text-black" />
                              )}
                            </>
                          );
                        })()}
                        {(q.questionType === "text" || q.questionType === "textarea") && (
                          <FormControl>
                            <Textarea
                              className="resize-none rounded-xl border-gray-200 text-sm !text-black"
                              placeholder="답변을 입력해주세요"
                              rows={q.questionType === "textarea" ? 3 : 2}
                              value={typeof field.value === "string" ? field.value : ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                        )}
                      </FormItem>
                    )}
                  />
                ))}

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
                              className="resize-none rounded-xl border-gray-200 text-sm !text-black"
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
                {showMessage && (
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">사전 질문 <span className="text-gray-400 font-normal">(선택)</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="라이브에서 다루었으면 하는 질문을 남겨주세요." className="resize-none rounded-xl border-gray-200" {...field} data-testid="input-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleOpenChange(false)}>취소</Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-[#111318] rounded-xl font-semibold"
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

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
