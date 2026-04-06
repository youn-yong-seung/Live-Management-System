import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { Calendar, Users, CheckCircle, Loader2 } from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

interface LiveInfo {
  id: number; title: string; description: string | null;
  youtubeUrl: string | null; scheduledAt: string | null;
  status: string; thumbnailUrl: string | null; registrationCount: number;
}

interface FormConfig {
  showEmail: boolean; showIndustry: boolean; showChannelSource: boolean;
  showSkillLevel: boolean; showMessage: boolean; showMarketingConsent: boolean;
  channelSourceOptions: string[] | null; industryOptions: string[] | null;
  aiRecommendedQuestions: { question: string; questionType: string; options?: string[] }[] | null;
  thankYouTitle: string | null; thankYouBody: string | null;
}

interface CustomQuestion {
  id: number; question: string; questionType: string; options: string[] | null;
}

/* ── Defaults ───────────────────────────────────────── */

const DEFAULT_INDUSTRIES = ["제조업", "도소매업", "음식점/카페", "서비스업", "교육", "IT/소프트웨어", "의료/헬스케어", "부동산", "금융", "프리랜서/1인 기업", "직접 입력"];
const DEFAULT_CHANNELS = ["유튜브", "인스타그램", "네이버 블로그", "지인 추천", "카카오채널", "구글 검색", "직접 입력"];

const schema = z.object({
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

type FormValues = z.infer<typeof schema>;

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
  return m ? m[1] : null;
}

/* ── Component ──────────────────────────────────────── */

export default function RegisterPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/lives/:id/register");
  const liveId = parseInt(params?.id ?? "0", 10);

  const [live, setLive] = useState<LiveInfo | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", message: "", industry: "", industryCustom: "", channelSource: [], channelSourceCustom: "", skillLevel: "", customAnswers: {} },
  });

  useEffect(() => {
    if (!liveId) return;
    Promise.all([
      fetch(`/api/lives/${liveId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/lives/${liveId}/form-config`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/lives/${liveId}/custom-questions`).then((r) => r.ok ? r.json() : []),
    ]).then(([l, fc, qs]) => {
      setLive(l);
      setFormConfig(fc);
      setCustomQuestions(Array.isArray(qs) ? qs : []);
    }).finally(() => setLoading(false));
  }, [liveId]);

  const fc = formConfig;
  const showEmail = fc?.showEmail ?? true;
  const showIndustry = fc?.showIndustry ?? true;
  const showChannelSource = fc?.showChannelSource ?? true;
  const showMessage = fc?.showMessage ?? true;
  const activeChannels = fc?.channelSourceOptions ?? DEFAULT_CHANNELS;
  const activeIndustries = fc?.industryOptions ?? DEFAULT_INDUSTRIES;
  const aiQuestions = fc?.aiRecommendedQuestions ?? [];

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const industry = data.industry === "직접 입력" && data.industryCustom ? data.industryCustom : data.industry || null;
      const channels = data.channelSource?.map((ch) => ch === "직접 입력" && data.channelSourceCustom ? data.channelSourceCustom : ch);

      const res = await fetch(`/api/lives/${liveId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name, phone: data.phone, email: data.email || null,
          message: data.message || null, industry,
          channelSource: channels?.length ? channels : null,
          skillLevel: data.skillLevel || null,
          customAnswers: data.customAnswers && Object.keys(data.customAnswers).length ? data.customAnswers : null,
        }),
      });
      if (!res.ok) throw new Error("신청 실패");
      setSubmitted(true);
    } catch {
      toast({ variant: "destructive", title: "신청 중 오류가 발생했습니다." });
    }
    setSubmitting(false);
  };

  // Loading
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#050A0A" }}>
      <Loader2 className="h-6 w-6 animate-spin text-[#CC9965]" />
    </div>
  );

  // Not found
  if (!live) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#050A0A" }}>
      <p className="text-white/50">라이브를 찾을 수 없습니다.</p>
    </div>
  );

  const ytId = live.youtubeUrl ? extractYoutubeId(live.youtubeUrl) : null;
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  // Thank you page
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#050A0A" }}>
      <div className="max-w-md w-full glass-card-gold p-8 text-center">
        <CheckCircle className="h-12 w-12 text-[#CC9965] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{fc?.thankYouTitle || "신청이 완료되었습니다!"}</h2>
        <p className="text-white/50 text-sm whitespace-pre-wrap mb-6">{fc?.thankYouBody || "라이브 시작 전 알림톡으로 접속 링크를 보내드립니다."}</p>
        <a
          href="https://open.kakao.com/o/gCM9Aehi"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#FEE500] text-[#3C1E1E] font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#FDD800] transition-colors"
        >
          💬 무료 특강 대기방 입장하기
        </a>
      </div>
    </div>
  );

  // Registration form
  return (
    <div className="min-h-screen" style={{ background: "#050A0A" }}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xl font-black text-[#CC9965]">윤자동</span>
          <span className="text-white/40 text-sm ml-2">클래스</span>
        </div>

        {/* Thumbnail */}
        {thumb && (
          <div className="rounded-2xl overflow-hidden mb-6">
            <img src={thumb} alt={live.title} className="w-full aspect-video object-cover" />
          </div>
        )}

        {/* Live info */}
        <div className="glass-card p-5 mb-6">
          <h1 className="text-lg font-bold text-white mb-2">{live.title}</h1>
          {live.description && <p className="text-sm text-white/50 mb-3">{live.description}</p>}
          <div className="flex items-center gap-4 text-xs text-white/40">
            {live.scheduledAt && (
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#CC9965]" />{formatDate(live.scheduledAt)}</span>
            )}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#CC9965]" />{live.registrationCount}명 신청</span>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* 이름 */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-white/70">이름 <span className="text-red-400">*</span></FormLabel>
                  <FormControl><Input placeholder="이름을 입력해주세요" className="rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 연락처 */}
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-white/70">연락처 <span className="text-red-400">*</span></FormLabel>
                  <FormControl><Input placeholder="010-0000-0000" className="rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 이메일 */}
              {showEmail && (
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white/70">이메일</FormLabel>
                    <FormControl><Input type="email" placeholder="example@email.com" className="rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* 유입경로 */}
              {showChannelSource && (
                <FormField control={form.control} name="channelSource" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white/70">어디서 보고 오셨나요?</FormLabel>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {activeChannels.map((ch) => {
                        const checked = (field.value as string[] | undefined)?.includes(ch) ?? false;
                        return (
                          <div key={ch} className="flex items-center gap-2">
                            <Checkbox id={`r-ch-${ch}`} checked={checked}
                              onCheckedChange={(v) => { const c = (field.value as string[]) ?? []; field.onChange(v ? [...c, ch] : c.filter((x) => x !== ch)); }}
                              className="rounded border-white/20" />
                            <Label htmlFor={`r-ch-${ch}`} className="text-sm text-white/70 cursor-pointer">{ch}</Label>
                          </div>
                        );
                      })}
                    </div>
                    {(field.value as string[] | undefined)?.includes("직접 입력") && (
                      <Input placeholder="직접 입력해주세요" className="mt-2 rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30" {...form.register("channelSourceCustom")} />
                    )}
                  </FormItem>
                )} />
              )}

              {/* 업종 */}
              {showIndustry && (
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white/70">업종</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-white/10 bg-white/5 !text-white">
                          <SelectValue placeholder="업종을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>{activeIndustries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                    {field.value === "직접 입력" && (
                      <Input placeholder="업종을 직접 입력해주세요" className="mt-2 rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30" {...form.register("industryCustom")} />
                    )}
                  </FormItem>
                )} />
              )}

              {/* AI 추천 질문 */}
              {aiQuestions.map((q, qi) => (
                <FormField key={`ai-${qi}`} control={form.control} name={`customAnswers.ai_${qi}`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white/70">{q.question}</FormLabel>
                    {q.questionType === "radio" && q.options && (
                      <RadioGroup onValueChange={field.onChange} value={typeof field.value === "string" ? field.value : ""} className="pt-1 space-y-2">
                        {q.options.map((opt) => (
                          <div key={opt} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`r-ai${qi}-${opt}`} />
                            <Label htmlFor={`r-ai${qi}-${opt}`} className="text-sm text-white/70 cursor-pointer">{opt}</Label>
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
                              <Checkbox id={`r-ai${qi}-${opt}`} checked={vals.includes(opt)}
                                onCheckedChange={(v) => field.onChange(v ? [...vals, opt] : vals.filter((x) => x !== opt))}
                                className="rounded border-white/20" />
                              <Label htmlFor={`r-ai${qi}-${opt}`} className="text-sm text-white/70 cursor-pointer">{opt}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {(q.questionType === "text" || q.questionType === "textarea") && (
                      <FormControl>
                        <Textarea placeholder="답변을 입력해주세요" rows={q.questionType === "textarea" ? 3 : 2}
                          className="resize-none rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30 text-sm"
                          value={typeof field.value === "string" ? field.value : ""} onChange={(e) => field.onChange(e.target.value)} />
                      </FormControl>
                    )}
                  </FormItem>
                )} />
              ))}

              {/* 사전 질문 */}
              {showMessage && (
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white/70">사전 질문 (선택)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="궁금한 점을 남겨주세요" className="resize-none rounded-xl border-white/10 bg-white/5 !text-white placeholder:text-white/30" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              )}

              {/* 제출 */}
              <Button type="submit" className="w-full bg-[#CC9965] hover:bg-[#d4a570] text-black font-bold rounded-xl gold-glow py-3" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                참가 신청하기
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
