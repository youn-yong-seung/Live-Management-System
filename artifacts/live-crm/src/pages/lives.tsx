import { useState, useEffect, useMemo } from "react";
import { useGetLives, getGetLivesQueryKey, useCreateRegistration, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Video, Calendar, Users, ChevronLeft, ChevronRight, PlayCircle, Star, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { ReplayModal } from "@/components/replay-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths, isToday,
} from "date-fns";
import { ko } from "date-fns/locale";
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
  const [, navigate] = useLocation();
  const [modalReplay, setModalReplay] = useState<any>(null);
  const queryClient = useQueryClient();
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

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

  /* ── Calendar state ──────────────────────── */
  const [calMonth, setCalMonth] = useState(new Date());

  const calDays = useMemo(() => {
    const monthStart = startOfMonth(calMonth);
    const monthEnd = endOfMonth(calMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const liveDates = useMemo(() => {
    const map = new Map<string, NonNullable<typeof lives>[number][]>();
    (lives ?? []).forEach((live) => {
      if (!live.scheduledAt) return;
      const key = format(new Date(live.scheduledAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(live);
    });
    return map;
  }, [lives]);

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white mb-1">라이브 신청</h1>
        <p className="text-white/50 text-sm">예정된 라이브 일정을 확인하고 참가 신청하세요. 신청 시 카카오 알림톡이 발송됩니다.</p>
      </div>

      {/* ── Monthly Calendar ──────────────────── */}
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setCalMonth(subMonths(calMonth, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-[#CC9965] hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-base font-bold text-white">
            {format(calMonth, "yyyy년 M월", { locale: ko })}
          </h3>
          <button
            onClick={() => setCalMonth(addMonths(calMonth, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-[#CC9965] hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-white/30 py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayLives = liveDates.get(key);
            const inMonth = isSameMonth(day, calMonth);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={`relative py-2 text-center ${!inMonth ? "opacity-20" : ""}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm transition-colors ${
                    today
                      ? "bg-[#CC9965]/20 text-[#CC9965] font-bold border border-[#CC9965]/30"
                      : dayLives
                        ? "text-white font-semibold"
                        : "text-white/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayLives && inMonth && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {dayLives.slice(0, 3).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#CC9965]" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming list under calendar */}
        {lives && lives.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/[0.06] space-y-3">
            {lives.slice(0, 5).map((live) => (
              <div
                key={live.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
                onClick={() => { setSelectedLiveId(live.id); setIsDialogOpen(true); }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#CC9965]/15 border border-[#CC9965]/20 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-[#CC9965]/70 font-medium leading-none">
                    {live.scheduledAt ? format(new Date(live.scheduledAt), "M월") : "-"}
                  </span>
                  <span className="text-sm font-bold text-[#CC9965] leading-none">
                    {live.scheduledAt ? format(new Date(live.scheduledAt), "d") : "-"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{live.title}</p>
                  <p className="text-xs text-white/40">
                    {live.scheduledAt ? format(new Date(live.scheduledAt), "a h:mm", { locale: ko }) : "시간 미정"}
                    {" · "}신청자 {live.registrationCount}명
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-[#CC9965] hover:bg-[#d4a570] text-black font-bold text-xs rounded-lg gold-glow flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setSelectedLiveId(live.id); setIsDialogOpen(true); }}
                >
                  신청
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Live Now ─────────────────────────────── */}
      {activeLives && activeLives.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            지금 라이브 중
          </h2>
          {activeLives.map((live) => (
            <div key={live.id} className="glass-card-gold hover:-translate-y-1 transition-all duration-300 p-6">
              <div className="cursor-pointer" onClick={() => setModalReplay(live)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wide">LIVE NOW</span>
                  <span className="text-xs text-white/30">{live.registrationCount}명 참석</span>
                </div>
                <h3 className="font-bold text-white hover:text-[#CC9965] transition-colors mb-1">{live.title}</h3>
                <p className="text-sm text-white/50 line-clamp-2 mb-3">{live.description}</p>
              </div>
              <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                {live.youtubeUrl && (
                  <a href={live.youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
                    <PlayCircle className="h-3.5 w-3.5" /> 라이브 입장하기
                  </a>
                )}
                <button
                  className="flex-1 flex items-center justify-center gap-2 border border-white/10 text-white/60 hover:text-[#CC9965] hover:border-[#CC9965]/30 text-xs font-bold py-2.5 rounded-lg transition-colors"
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
                  <span className="inline-block bg-[#CC9965]/15 text-[#CC9965] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#CC9965]/30">예정됨</span>
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

      <ReplayModal replay={modalReplay} onClose={() => setModalReplay(null)} />
    </div>
  );
}
