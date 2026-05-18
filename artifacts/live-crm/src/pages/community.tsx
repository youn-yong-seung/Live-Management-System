import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  MessageSquare,
  Eye,
  PenSquare,
  ChevronRight,
  Shield,
  Lightbulb,
  Sparkles,
  Video,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

interface PostRow {
  id: number;
  title: string;
  body: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorAvatarUrl: string | null;
  authorRole: "user" | "admin" | null;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostRow[] | null>(null);

  useEffect(() => {
    fetch("/api/community/posts")
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  return (
    <div className="space-y-8">
      {/* 고민상담소 진입 배너 */}
      <Link href="/community/consultations">
        <div
          className="glass-card-gold p-5 sm:p-6 cursor-pointer hover:-translate-y-0.5 transition-all group"
          data-testid="consultation-banner"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-[#6366F1]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-[#6366F1]/15 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#6366F1] border border-[#6366F1]/30 mb-2">
                <Sparkles className="h-3 w-3" /> NEW · 윤자동의 자동화 상담소
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#111318] mb-1 leading-snug">
                반복업무·자동화 고민, 18년 경력으로 처방해드려요
              </h2>
              <p className="text-xs sm:text-sm text-[#484d57] leading-relaxed">
                폼 한 번 작성하면 라이브 신청까지 자동 완료. 인기 사연은 라이브에서 직접 답변드립니다.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#8b8f98] group-hover:text-[#6366F1] flex-shrink-0 self-center transition-colors" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 pl-16">
            <span className="inline-flex items-center gap-1 text-[11px] text-[#6366F1] font-semibold">
              <Video className="h-3 w-3" /> 매주 목요일 라이브
            </span>
            <span className="text-[11px] text-[#8b8f98]">·</span>
            <span className="text-[11px] text-[#484d57] font-semibold">
              사연 신청 → 자동 처방 → 라이브 픽업
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-[#111318] mb-1">커뮤니티</h1>
          <p className="text-[#8b8f98] text-sm">프롬프트·코드 공유, 만든 거 자랑, 질문 — 회원이면 누구나 자유롭게.</p>
        </div>
        {user ? (
          <Link href="/community/new">
            <span className="inline-flex items-center gap-2 bg-[#6366F1] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#818CF8] transition-all cursor-pointer gold-glow">
              <PenSquare className="h-4 w-4" /> 글쓰기
            </span>
          </Link>
        ) : (
          <Link href="/login">
            <span className="inline-flex items-center gap-2 border border-[#d1d5db] text-[#111318] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#f7f8fa] cursor-pointer transition-all">
              로그인 후 글쓰기
            </span>
          </Link>
        )}
      </div>

      {posts === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 w-2/3 bg-[#f7f8fa] rounded mb-2" />
              <div className="h-3 w-1/3 bg-[#f7f8fa] rounded" />
            </div>
          ))}
        </div>
      )}

      {posts !== null && posts.length === 0 && (
        <div className="glass-card p-12 text-center">
          <MessageSquare className="h-10 w-10 text-[#d1d5db] mx-auto mb-4" />
          <p className="text-[#8b8f98] text-sm mb-1">아직 글이 없어요.</p>
          <p className="text-[#a0a4ab] text-xs">첫 번째 글을 작성해보세요.</p>
        </div>
      )}

      {posts !== null && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/community/${p.id}`}>
              <div className="glass-card hover:bg-[#eef0f3] hover:-translate-y-0.5 transition-all p-5 cursor-pointer group" data-testid={`post-${p.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-bold text-[#111318] text-base leading-snug line-clamp-1 group-hover:text-[#6366F1] transition-colors">
                    {p.title}
                  </h2>
                  <ChevronRight className="h-4 w-4 text-[#d1d5db] group-hover:text-[#6366F1] flex-shrink-0 mt-1 transition-colors" />
                </div>
                <p className="text-sm text-[#8b8f98] line-clamp-2 mb-3 whitespace-pre-line">{p.body}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#8b8f98]">
                  <div className="flex items-center gap-1.5">
                    {p.authorAvatarUrl ? (
                      <img src={p.authorAvatarUrl} alt={p.authorName ?? ""} className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30" />
                    )}
                    <span>{p.authorName ?? "회원"}</span>
                    {p.authorRole === "admin" && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30">
                        <Shield className="h-2.5 w-2.5" /> ADMIN
                      </span>
                    )}
                  </div>
                  <span>{formatRelative(p.createdAt)}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.viewCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {p.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
