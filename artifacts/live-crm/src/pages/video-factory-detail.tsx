import { useState, useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ExternalLink, Eye, Users, Calendar, Film, Copy, Check,
  History, Lock, Loader2, Anchor, Target, Clock, MessageSquare, Lightbulb
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PLANS, type VideoRef, type PlanVersion } from "@/lib/video-plans";

function toKr(n: number) {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "천";
  return n.toString();
}

function daysAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 864e5);
  if (diff <= 0) return "오늘";
  if (diff < 30) return `${diff}일 전`;
  if (diff < 365) return `${Math.floor(diff / 30)}개월 전`;
  return `${Math.floor(diff / 365)}년 전`;
}

function extractVideoId(url: string) {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function VideoRefRow({ video, anchor = false }: { video: VideoRef; anchor?: boolean }) {
  const thumb = extractVideoId(video.url) ? `https://img.youtube.com/vi/${extractVideoId(video.url)}/mqdefault.jpg` : null;
  return (
    <a
      href={video.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex gap-4 p-4 rounded-md transition-all duration-200 ${video.url ? "hover:bg-white/[0.03] cursor-pointer" : "opacity-60"} ${anchor ? "border border-white/10 bg-white/[0.02]" : "border border-white/[0.05]"}`}
    >
      <div className="w-32 aspect-video bg-white/[0.03] rounded relative overflow-hidden flex-shrink-0">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-5 h-5 text-white/20" />
          </div>
        )}
        {anchor && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-white/90 text-black text-[9px] font-bold">
            ANCHOR
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 line-clamp-2 leading-snug font-medium">{video.title}</p>
        <p className="text-xs text-white/40 mt-1">{video.channel}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{toKr(video.views)}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{toKr(video.subs)}</span>
          {video.uploadDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{daysAgo(video.uploadDate)}</span>}
          <span className="text-white/50 font-medium">{video.ratio.toFixed(1)}x</span>
        </div>
      </div>
      {video.url && <ExternalLink className="w-4 h-4 text-white/20 flex-shrink-0" />}
    </a>
  );
}

function Section({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{title}</h3>
        {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function VersionDetail({ v }: { v: PlanVersion }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const fullScript = `
[영상 주제]
${v.topic}
부제: ${v.subtitle}

[타겟]
${v.target}

[목표 길이]
${v.targetLength}

[핵심 메시지]
${v.coreMessage}

[형식]
${v.format}

━━━ 인트로 ━━━
${v.intro.crisis}
${v.intro.empathy}
${v.intro.promise}

━━━ 본문 — 기본 세팅 ━━━
${v.body.setup.map((s, i) => `${i + 1}. ${s}`).join("\n")}

━━━ 본문 — ${v.bodyFormat === "단계별프롬프트형" || v.bodyFormat === "3단계구축형" ? "단계별 프롬프트" : "실습 사례"} ━━━
${v.body.practices.map((p, i) => {
    let line = `${i + 1}. ${p.title}`;
    if (p.prompt) line += `\n   💬 ${p.prompt}`;
    if (p.highlight) line += `\n   ⭐ ${p.highlight}`;
    return line;
  }).join("\n\n")}

━━━ 중간 CTA ━━━
${v.body.midCta}

━━━ 엔딩 CTA ━━━
1) 리드 수집: ${v.endingCta.leadMagnet}
2) 구독 유도: ${v.endingCta.subscribe}
3) 댓글 유도: ${v.endingCta.comment}
${v.outro ? `\n━━━ 아웃트로 ━━━\n${v.outro}` : ""}
`.trim();

  return (
    <div className="space-y-10">
      {/* 1. 영상 개요 */}
      <Section title="1. 영상 개요">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">주제</p>
            <p className="text-base font-semibold text-white leading-snug">{v.topic}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">부제</p>
            <p className="text-sm text-white/80">{v.subtitle}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-[10px] text-white/40 uppercase mb-1.5 flex items-center gap-1.5"><Target className="w-3 h-3" />타겟</p>
            <p className="text-sm text-white/80">{v.target}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-[10px] text-white/40 uppercase mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" />목표 길이</p>
            <p className="text-sm text-white/80">{v.targetLength}</p>
          </div>
          <div className="glass-card p-5 sm:col-span-2">
            <p className="text-[10px] text-white/40 uppercase mb-1.5 flex items-center gap-1.5"><Lightbulb className="w-3 h-3" />핵심 메시지</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.coreMessage}</p>
          </div>
          <div className="glass-card p-5 sm:col-span-2">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">형식</p>
            <p className="text-sm text-white/80">{v.format}</p>
          </div>
        </div>
      </Section>

      {/* 2. 벤치마킹 분석 */}
      <Section title="2. 벤치마킹 분석">
        <div className="space-y-4">
          {/* 앵커 영상 */}
          <div className="glass-card p-5">
            <p className="text-[10px] text-white/40 uppercase mb-3 flex items-center gap-1.5"><Anchor className="w-3 h-3" />앵커 벤치마킹 영상</p>
            <VideoRefRow video={v.anchor} anchor />
          </div>

          {/* 채널 규모 / 성과 / 특징 */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="glass-card p-5">
              <p className="text-[10px] text-white/40 uppercase mb-1.5">채널 규모</p>
              <p className="text-sm text-white/80">{toKr(v.anchor.subs)} 구독자</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-[10px] text-white/40 uppercase mb-1.5">성과</p>
              <p className="text-sm text-white/80">{toKr(v.anchor.views)}뷰 / {v.anchor.ratio.toFixed(1)}x</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-[10px] text-white/40 uppercase mb-1.5">특징</p>
              <p className="text-xs text-white/70 leading-relaxed">{v.rationale.structural}</p>
            </div>
          </div>

          {/* 시사점 */}
          <div className="glass-card p-5">
            <p className="text-[10px] text-white/40 uppercase mb-3">벤치마킹 시사점</p>
            <ul className="space-y-2">
              {v.insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/70">
                  <span className="text-white/30 flex-shrink-0">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 3. 썸네일 & 제목 */}
      <Section title="3. 썸네일 & 제목">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 flex flex-col items-center justify-center aspect-video">
            <span className="text-3xl font-black text-white tracking-tight">{v.thumbTitle}</span>
            <span className="text-[11px] text-white/50 text-center px-2 leading-tight mt-2">{v.thumbSub}</span>
          </div>
          <div className="glass-card p-5 sm:col-span-2 flex flex-col justify-center">
            <p className="text-[10px] text-white/40 uppercase mb-2">영상 제목 (SEO)</p>
            <p className="text-sm text-white/90 leading-relaxed">{v.videoTitle}</p>
          </div>
        </div>
      </Section>

      {/* 4. 인트로 */}
      <Section title="4. 인트로 (30초 룰)">
        <div className="glass-card p-5 space-y-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase mb-1.5">위기 환기</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.intro.crisis}</p>
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">공감</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.intro.empathy}</p>
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">약속 + 행동 명령</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.intro.promise}</p>
          </div>
          <button
            onClick={() => copyText(`${v.intro.crisis}\n${v.intro.empathy}\n${v.intro.promise}`, "intro")}
            className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1.5"
          >
            {copied === "intro" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied === "intro" ? "복사됨" : "인트로 복사"}
          </button>
        </div>
      </Section>

      {/* 5. 본문 */}
      <Section title="5. 본문 구조">
        <div className="glass-card p-5 space-y-6">
          {/* 기본 세팅 */}
          <div>
            <p className="text-[10px] text-white/40 uppercase mb-2">기본 세팅</p>
            <ul className="space-y-1.5">
              {v.body.setup.map((s, i) => (
                <li key={i} className="text-sm text-white/70 flex gap-2">
                  <span className="text-white/30">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-white/[0.06] pt-6">
            <p className="text-[10px] text-white/40 uppercase mb-3">
              {v.bodyFormat === "단계별프롬프트형" || v.bodyFormat === "3단계구축형" ? "단계별 프롬프트" : "실습 사례"} ({v.body.practices.length}개)
            </p>
            <div className="space-y-4">
              {v.body.practices.map((p, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/[0.06] text-white/70 text-xs flex items-center justify-center font-semibold flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-white/90 leading-relaxed pt-0.5">{p.title}</p>
                  </div>
                  {p.prompt && (
                    <div className="ml-9 p-3 rounded bg-white/[0.03] border border-white/[0.06] text-xs text-white/60 font-mono leading-relaxed">
                      {p.prompt}
                    </div>
                  )}
                  {p.highlight && (
                    <p className="ml-9 text-xs text-white/40">⭐ {p.highlight}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6">
            <p className="text-[10px] text-white/40 uppercase mb-2">중간 CTA</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.body.midCta}</p>
          </div>
        </div>
      </Section>

      {/* 6. 엔딩 CTA */}
      <Section title="6. 엔딩 CTA (3중 구조)">
        <div className="glass-card p-5 space-y-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase mb-1.5">리드 수집</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.endingCta.leadMagnet}</p>
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">구독 유도</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.endingCta.subscribe}</p>
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[10px] text-white/40 uppercase mb-1.5">댓글 유도</p>
            <p className="text-sm text-white/80 leading-relaxed">{v.endingCta.comment}</p>
          </div>
          {v.outro && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[10px] text-white/40 uppercase mb-1.5">아웃트로 멘트</p>
              <p className="text-sm text-white/80 italic leading-relaxed">"{v.outro}"</p>
            </div>
          )}
        </div>
      </Section>

      {/* 7. 보조 레퍼런스 */}
      {v.additionalRefs.length > 0 && (
        <Section title="7. 보조 레퍼런스">
          <div className="space-y-2">
            {v.additionalRefs.map(r => <VideoRefRow key={r.id} video={r} />)}
          </div>
        </Section>
      )}

      {/* 전체 복사 */}
      <div className="pt-4">
        <button
          onClick={() => copyText(fullScript, "full")}
          className="w-full py-3.5 rounded-md bg-white/[0.05] hover:bg-white/[0.08] text-white/80 text-sm font-medium border border-white/[0.08] transition-colors flex items-center justify-center gap-2"
        >
          {copied === "full" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied === "full" ? "복사 완료" : "전체 기획안 복사"}
        </button>
      </div>
    </div>
  );
}

export default function VideoFactoryDetail() {
  const [, params] = useRoute("/video-factory/:id");
  const [, navigate] = useLocation();
  const planId = params?.id;

  // Auth gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return sessionStorage.getItem("crm_admin_auth") === "1"; } catch { return false; }
  });
  const [loginPwd, setLoginPwd] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const plan = useMemo(() => PLANS.find(p => p.id === planId), [planId]);
  const [selectedVersion, setSelectedVersion] = useState<number>(plan ? plan.versions[plan.versions.length - 1].version : 1);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPwd }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      sessionStorage.setItem("crm_admin_auth", "1");
      if (data.token) sessionStorage.setItem("crm_admin_token", data.token);
      setIsAuthenticated(true);
      setLoginPwd("");
    } catch {
      alert("비밀번호가 틀렸습니다");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleLogin} className="glass-card p-8 w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-white/60" />
            </div>
            <h2 className="text-base font-semibold text-white">영상 기획 공장</h2>
            <p className="text-xs text-white/40">관리자 비밀번호를 입력하세요</p>
          </div>
          <Input
            type="password"
            placeholder="비밀번호"
            value={loginPwd}
            onChange={e => setLoginPwd(e.target.value)}
            className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
            autoFocus
          />
          <Button type="submit" disabled={isLoggingIn || !loginPwd} className="w-full bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10">
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "로그인"}
          </Button>
        </form>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <Link href="/video-factory">
          <button className="text-sm text-white/60 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> 목록으로
          </button>
        </Link>
        <div className="glass-card p-12 text-center">
          <p className="text-white/40">기획안을 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const currentVersion = plan.versions.find(v => v.version === selectedVersion) || plan.versions[plan.versions.length - 1];

  return (
    <div className="space-y-8">
      {/* 헤더 — 뒤로가기 + 버전 선택 */}
      <div className="space-y-4">
        <Link href="/video-factory">
          <button className="text-xs text-white/40 hover:text-white/80 flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> 기획안 목록
          </button>
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{currentVersion.topic}</h1>
            <p className="text-sm text-white/50 mt-1">{currentVersion.subtitle}</p>
          </div>

          {/* 버전 선택 */}
          {plan.versions.length > 1 && (
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-white/40" />
              <div className="flex border border-white/10 rounded-md overflow-hidden">
                {plan.versions.map(ver => (
                  <button
                    key={ver.version}
                    onClick={() => setSelectedVersion(ver.version)}
                    className={`px-3 py-1.5 text-xs transition-colors ${
                      selectedVersion === ver.version
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                  >
                    {ver.versionLabel}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 버전 변경 메모 */}
        {currentVersion.changeNote && (
          <div className="glass-card p-4 border-l-2 border-white/30">
            <p className="text-[10px] text-white/40 uppercase mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> {currentVersion.versionLabel} 변경 사유 ({currentVersion.createdAt})
            </p>
            <p className="text-xs text-white/70 leading-relaxed">{currentVersion.changeNote}</p>
          </div>
        )}
      </div>

      {/* 본문 */}
      <VersionDetail v={currentVersion} />
    </div>
  );
}
