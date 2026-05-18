import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Lightbulb,
  Briefcase,
  Phone,
  User as UserIcon,
  Video,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date-utils";

const AGE_RANGES = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];
const INDUSTRIES = [
  "건강/의료",
  "IT/소프트웨어",
  "교육",
  "제조업",
  "유통/이커머스",
  "서비스업",
  "음식점/카페",
  "금융/투자",
  "법률/세무",
  "디자인/콘텐츠",
  "부동산",
  "1인 지식창업",
  "기타",
];
const JOB_TYPES = [
  "1인 대표 / 프리랜서",
  "5인 이하 사업 대표",
  "5인 이상 사업 대표",
  "직장인",
  "공무원 / 공기업",
  "학생 / 취준생",
  "기타",
];

interface UpcomingLive {
  id: number;
  title: string;
  scheduledAt: string | null;
}

interface FormConfig {
  board: { badge: string; title: string; description: string };
  form: {
    badge: string;
    title: string;
    description: string;
    fields: {
      currentWork: { label: string; hint: string; placeholder: string };
      concern: { label: string; hint: string; placeholder: string };
      hardest: { label: string; hint: string; placeholder: string };
    };
    submitLabel: string;
    liveCheckboxLabel: string;
    liveCheckboxDescription: string;
  };
  thankYou: { title: string; body: string };
}

const FALLBACK_FORM_CONFIG: FormConfig = {
  board: { badge: "윤자동의 자동화 상담소", title: "", description: "" },
  form: {
    badge: "윤자동의 자동화 상담소",
    title: "사연 신청하기",
    description: "",
    fields: {
      currentWork: { label: "어떤 일을 하고 계신가요?", hint: "", placeholder: "" },
      concern: { label: "어떤 고민이 있으신가요?", hint: "", placeholder: "" },
      hardest: { label: "가장 힘든 게 무엇인가요?", hint: "", placeholder: "" },
    },
    submitLabel: "사연 제출하기",
    liveCheckboxLabel: "이번 라이브에도 참가할래요",
    liveCheckboxDescription: "",
  },
  thankYou: { title: "사연이 등록되었어요!", body: "" },
};

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function CommunityConsultationNew() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [upcomingLive, setUpcomingLive] = useState<UpcomingLive | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig>(FALLBACK_FORM_CONFIG);

  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [industryCustom, setIndustryCustom] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobTypeCustom, setJobTypeCustom] = useState("");
  const [currentWork, setCurrentWork] = useState("");
  const [concern, setConcern] = useState("");
  const [hardest, setHardest] = useState("");
  const [liveRequested, setLiveRequested] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    consultationId: number;
    liveRegistered: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/community/consultations/meta/upcoming-live")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUpcomingLive(d?.live ?? null))
      .catch(() => setUpcomingLive(null));
    fetch("/api/community/consultations/meta/form-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.config) setFormConfig(d.config);
      })
      .catch(() => {});
  }, []);

  const cfgForm = formConfig.form;
  const cfgFields = cfgForm.fields;
  const cfgThankYou = formConfig.thankYou;

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-[#f7f8fa] border border-[#e5e7eb] text-[#111318] placeholder:text-[#a0a4ab] focus:outline-none focus:border-[#6366F1]/50 focus:bg-[#eef0f3] transition-colors disabled:opacity-50";

  const liveDateLabel = useMemo(() => {
    if (!upcomingLive) return null;
    if (!upcomingLive.scheduledAt) return upcomingLive.title;
    return `${formatDate(upcomingLive.scheduledAt)} · ${upcomingLive.title}`;
  }, [upcomingLive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (name.trim().length < 2) return setErrorMsg("성함을 정확히 입력해주세요.");
    if (!ageRange) return setErrorMsg("나이대를 선택해주세요.");
    if (phone.replace(/\D/g, "").length < 9)
      return setErrorMsg("연락처를 정확히 입력해주세요.");
    if (!industry) return setErrorMsg("직군분야를 선택해주세요.");
    if (industry === "기타" && !industryCustom.trim())
      return setErrorMsg("직군분야를 직접 입력해주세요.");
    if (!jobType) return setErrorMsg("직업구분을 선택해주세요.");
    if (jobType === "기타" && !jobTypeCustom.trim())
      return setErrorMsg("직업구분을 직접 입력해주세요.");
    if (currentWork.trim().length < 2) return setErrorMsg("어떤 일을 하시는지 알려주세요.");
    if (concern.trim().length < 2) return setErrorMsg("고민 내용을 적어주세요.");
    if (hardest.trim().length < 2) return setErrorMsg("가장 힘든 부분을 알려주세요.");

    setSubmitting(true);
    setErrorMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/community/consultations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: name.trim(),
        ageRange,
        phone: phone.trim(),
        industry,
        industryCustom: industry === "기타" ? industryCustom.trim() : null,
        jobType,
        jobTypeCustom: jobType === "기타" ? jobTypeCustom.trim() : null,
        currentWork: currentWork.trim(),
        concern: concern.trim(),
        hardest: hardest.trim(),
        liveRequested,
        liveId: liveRequested && upcomingLive ? upcomingLive.id : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data?.error ?? "사연 등록에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    const data = (await res.json()) as {
      consultation: { id: number };
      liveRegistered: boolean;
    };
    setSubmitted({
      consultationId: data.consultation.id,
      liveRegistered: data.liveRegistered,
    });
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <div className="glass-card-gold p-8 text-center space-y-5">
          <CheckCircle className="h-14 w-14 text-[#6366F1] mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-[#111318] mb-2">
              {cfgThankYou.title}
            </h2>
            <p className="text-[#484d57] text-sm leading-relaxed whitespace-pre-line">
              {cfgThankYou.body}
            </p>
          </div>

          {submitted.liveRegistered && upcomingLive && (
            <div className="bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 text-[#6366F1] text-xs font-bold mb-1">
                <Video className="h-3.5 w-3.5" /> 이번 라이브 신청 완료
              </div>
              <p className="text-sm text-[#111318] font-semibold">{upcomingLive.title}</p>
              {upcomingLive.scheduledAt && (
                <p className="text-xs text-[#8b8f98] mt-0.5">
                  {formatDate(upcomingLive.scheduledAt)}
                </p>
              )}
              <p className="text-xs text-[#484d57] mt-2 leading-relaxed">
                라이브 시작 전 알림톡으로 접속 링크를 보내드려요.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link href={`/community/consultations/${submitted.consultationId}`}>
              <span className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-black text-sm font-bold cursor-pointer transition-colors gold-glow">
                내 사연 보기
              </span>
            </Link>
            <Link href="/community/consultations">
              <span className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#e5e7eb] text-[#484d57] hover:bg-[#f7f8fa] text-sm font-medium cursor-pointer transition-colors">
                다른 사연 둘러보기
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link href="/community/consultations">
        <span className="inline-flex items-center gap-1.5 text-sm text-[#8b8f98] hover:text-[#6366F1] transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> 고민상담소
        </span>
      </Link>

      {/* 헤더 */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 rounded-full px-3 py-1 text-xs font-bold text-[#6366F1] border border-[#6366F1]/30">
          <Sparkles className="h-3.5 w-3.5" />
          {cfgForm.badge}
        </div>
        <h1 className="text-2xl font-bold text-[#111318]">{cfgForm.title}</h1>
        <p className="text-[#8b8f98] text-sm leading-relaxed whitespace-pre-line">
          {cfgForm.description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1) 본인 소개 */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#111318]">
            <UserIcon className="h-4 w-4 text-[#6366F1]" />
            <span>본인 소개</span>
          </div>

          <Field label="성함" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              maxLength={50}
              className={inputCls}
              data-testid="input-name"
            />
          </Field>

          <Field label="나이대" required>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AGE_RANGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAgeRange(a)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    ageRange === a
                      ? "bg-[#6366F1] text-black border-[#6366F1]"
                      : "bg-[#f7f8fa] text-[#484d57] border-[#e5e7eb] hover:bg-[#eef0f3]"
                  }`}
                  data-testid={`btn-age-${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Field>

          <Field label="연락처" required hint="라이브 알림톡 발송용 — 외부에 공개되지 않아요.">
            <div className="relative">
              <Phone className="h-4 w-4 text-[#a0a4ab] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                className={`${inputCls} pl-9`}
                data-testid="input-phone"
              />
            </div>
          </Field>
        </div>

        {/* 2) 직군·직업 */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#111318]">
            <Briefcase className="h-4 w-4 text-[#6366F1]" />
            <span>일하시는 분야</span>
          </div>

          <Field label="직군분야" required>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndustry(i)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors text-left ${
                    industry === i
                      ? "bg-[#6366F1] text-black border-[#6366F1]"
                      : "bg-[#f7f8fa] text-[#484d57] border-[#e5e7eb] hover:bg-[#eef0f3]"
                  }`}
                  data-testid={`btn-industry-${i}`}
                >
                  {i}
                </button>
              ))}
            </div>
            {industry === "기타" && (
              <input
                type="text"
                value={industryCustom}
                onChange={(e) => setIndustryCustom(e.target.value)}
                placeholder="직군분야를 직접 입력해주세요"
                maxLength={60}
                className={`${inputCls} mt-2`}
              />
            )}
          </Field>

          <Field label="직업구분" required hint="1인 대표인지, 5인 이상 운영인지로 처방이 달라져요.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {JOB_TYPES.map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setJobType(j)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors text-left ${
                    jobType === j
                      ? "bg-[#6366F1] text-black border-[#6366F1]"
                      : "bg-[#f7f8fa] text-[#484d57] border-[#e5e7eb] hover:bg-[#eef0f3]"
                  }`}
                  data-testid={`btn-job-${j}`}
                >
                  {j}
                </button>
              ))}
            </div>
            {jobType === "기타" && (
              <input
                type="text"
                value={jobTypeCustom}
                onChange={(e) => setJobTypeCustom(e.target.value)}
                placeholder="직업구분을 직접 입력해주세요"
                maxLength={60}
                className={`${inputCls} mt-2`}
              />
            )}
          </Field>

          <Field
            label={cfgFields.currentWork.label}
            required
            hint={cfgFields.currentWork.hint}
          >
            <textarea
              value={currentWork}
              onChange={(e) => setCurrentWork(e.target.value)}
              placeholder={cfgFields.currentWork.placeholder}
              rows={3}
              maxLength={2000}
              className={`${inputCls} resize-none`}
              data-testid="input-current-work"
            />
          </Field>
        </div>

        {/* 3) 고민 */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#111318]">
            <Lightbulb className="h-4 w-4 text-[#6366F1]" />
            <span>어디서 막혔나요?</span>
          </div>

          <Field
            label={cfgFields.concern.label}
            required
            hint={cfgFields.concern.hint}
          >
            <textarea
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              placeholder={cfgFields.concern.placeholder}
              rows={4}
              maxLength={2000}
              className={`${inputCls} resize-none`}
              data-testid="input-concern"
            />
          </Field>

          <Field
            label={cfgFields.hardest.label}
            required
            hint={cfgFields.hardest.hint}
          >
            <textarea
              value={hardest}
              onChange={(e) => setHardest(e.target.value)}
              placeholder={cfgFields.hardest.placeholder}
              rows={3}
              maxLength={2000}
              className={`${inputCls} resize-none`}
              data-testid="input-hardest"
            />
          </Field>
        </div>

        {/* 4) 라이브 동시 신청 */}
        <div
          className={`p-5 rounded-2xl border transition-colors ${
            liveRequested
              ? "bg-[#6366F1]/10 border-[#6366F1]/30"
              : "bg-[#f7f8fa] border-[#e5e7eb]"
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={liveRequested}
              onChange={(e) => setLiveRequested(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-[#d1d5db] text-[#6366F1] focus:ring-[#6366F1]/30"
              data-testid="checkbox-live-requested"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111318]">
                <Video className="h-4 w-4 text-[#6366F1]" />
                {cfgForm.liveCheckboxLabel}
              </div>
              {liveDateLabel ? (
                <p className="text-xs text-[#484d57] mt-1 leading-relaxed whitespace-pre-line">
                  <span className="font-semibold text-[#6366F1]">{liveDateLabel}</span>
                  {"\n"}
                  {cfgForm.liveCheckboxDescription}
                </p>
              ) : (
                <p className="text-xs text-[#8b8f98] mt-1">
                  현재 예정된 라이브가 없어요 — 다음 라이브가 잡히면 자동으로 안내드립니다.
                </p>
              )}
            </div>
          </label>
        </div>

        {errorMsg && (
          <p className="text-sm text-rose-600" role="alert" data-testid="error-msg">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Link href="/community/consultations">
            <span className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e5e7eb] text-sm font-medium text-[#484d57] hover:bg-[#f7f8fa] cursor-pointer transition-colors">
              취소
            </span>
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#6366F1] text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#818CF8] transition-all cursor-pointer disabled:opacity-50 gold-glow"
            data-testid="btn-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 등록 중...
              </>
            ) : (
              cfgForm.submitLabel
            )}
          </button>
        </div>

        {!user && (
          <p className="text-xs text-[#8b8f98] text-center leading-relaxed">
            비로그인으로도 사연 제출은 가능하지만,
            <br />
            로그인하시면 내 사연을 관리하고 다른 사연에 좋아요·댓글을 남길 수 있어요.
          </p>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-[#484d57]">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-[#8b8f98]">{hint}</p>}
    </div>
  );
}
