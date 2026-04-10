import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, ChevronRight, Lightbulb, Lock, Loader2, X, Clapperboard, Users, Target, Clock,
} from "lucide-react";
import { PLANS, getLatestVersion, type VideoPlan } from "@/lib/video-plans";

function toKr(n: number) {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "천";
  return n.toString();
}

function PlanListCard({ plan }: { plan: VideoPlan }) {
  const v = getLatestVersion(plan);
  const versionCount = plan.versions.length;

  return (
    <Link href={`/video-factory/${plan.id}`}>
      <div className="group glass-card p-6 cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200">
        <div className="flex items-start gap-5">
          {/* Thumbnail */}
          <div className="w-40 h-24 rounded-md bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-xl font-black text-white/80 tracking-tight">{v.thumbTitle}</span>
            <span className="text-[10px] text-white/40 text-center px-2 leading-tight mt-0.5">{v.thumbSub}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{v.subtitle}</span>
              {versionCount > 1 && (
                <span className="text-[10px] text-[#CC9965] font-medium">v{v.version} (총 {versionCount}개 버전)</span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white leading-snug mb-3">
              {v.topic}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <Target className="w-3 h-3" />
                {v.target}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {v.targetLength}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                벤치마크 {v.anchor.ratio.toFixed(1)}x
              </span>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
        </div>
      </div>
    </Link>
  );
}

export default function VideoFactory() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return sessionStorage.getItem("crm_admin_auth") === "1"; } catch { return false; }
  });
  const [loginPwd, setLoginPwd] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlans = useMemo(() => {
    if (!searchQuery) return PLANS;
    const q = searchQuery.toLowerCase();
    return PLANS.filter(p => {
      const v = getLatestVersion(p);
      return v.topic.toLowerCase().includes(q) ||
        v.subtitle.toLowerCase().includes(q) ||
        v.target.toLowerCase().includes(q) ||
        v.coreMessage.toLowerCase().includes(q);
    });
  }, [searchQuery]);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-1">
          <Clapperboard className="w-6 h-6 text-white/70" />
          <h1 className="text-2xl font-bold text-white">영상 기획 공장</h1>
        </div>
        <p className="text-white/40 text-sm ml-9">레퍼런스 기반 영상 기획 + 버전 관리 시스템</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card px-5 py-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">기획안</p>
          <p className="text-2xl font-bold text-white">{PLANS.length}<span className="text-sm text-white/30 font-normal ml-1">개</span></p>
        </div>
        <div className="glass-card px-5 py-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">총 버전</p>
          <p className="text-2xl font-bold text-white">{PLANS.reduce((s,p)=>s+p.versions.length,0)}<span className="text-sm text-white/30 font-normal ml-1">개</span></p>
        </div>
        <div className="glass-card px-5 py-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">평균 배율</p>
          <p className="text-2xl font-bold text-white">{(PLANS.reduce((s,p)=>s+getLatestVersion(p).anchor.ratio,0)/PLANS.length).toFixed(1)}<span className="text-sm text-white/30 font-normal ml-1">x</span></p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="기획안 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-white/30 hover:text-white/60" />
          </button>
        )}
      </div>

      {/* Plan List */}
      <div className="space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Search className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">검색 결과가 없습니다</p>
          </div>
        ) : (
          filteredPlans.map(plan => <PlanListCard key={plan.id} plan={plan} />)
        )}
      </div>
    </div>
  );
}
