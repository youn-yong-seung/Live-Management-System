import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TipTapEditor } from "@/components/tiptap-editor";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function CommunityNew() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (title.trim().length < 2) {
      setErrorMsg("제목은 2자 이상 입력해주세요.");
      return;
    }
    if (bodyText.trim().length < 1) {
      setErrorMsg("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setErrorMsg("세션이 만료되었습니다. 다시 로그인해주세요.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/community/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: title.trim(), body: bodyText, bodyHtml }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data?.error ?? "글 작성에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    const { post } = (await res.json()) as { post: { id: number } };
    navigate(`/community/${post.id}`);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/community">
        <span className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-[#CC9965] transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> 커뮤니티 목록
        </span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white mb-1">글쓰기</h1>
        <p className="text-white/50 text-sm">윤자동 클래스 커뮤니티에 글을 남겨주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          maxLength={200}
          disabled={submitting}
          className="w-full px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-lg font-semibold placeholder:text-white/30 focus:outline-none focus:border-[#CC9965]/50 focus:bg-white/[0.06] transition-colors disabled:opacity-50"
          data-testid="input-post-title"
        />

        <TipTapEditor
          value={bodyHtml}
          onChange={(html, plain) => {
            setBodyHtml(html);
            setBodyText(plain);
          }}
          placeholder="내용을 입력하세요. 마크다운 단축키도 사용할 수 있어요."
        />

        {errorMsg && (
          <p className="text-sm text-rose-400" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/community">
            <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-white/70 hover:bg-white/5 cursor-pointer transition-colors">
              취소
            </span>
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#CC9965] text-black font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-[#d4a570] transition-all cursor-pointer disabled:opacity-50 gold-glow"
            data-testid="btn-submit-post"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 등록 중...
              </>
            ) : (
              "등록하기"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
