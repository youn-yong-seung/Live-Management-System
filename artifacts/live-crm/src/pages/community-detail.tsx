import { useEffect, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Trash2, Send, Eye, Shield, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface Post {
  id: number;
  title: string;
  body: string;
  bodyHtml: string | null;
  viewCount: number;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorAvatarUrl: string | null;
  authorRole: "user" | "admin" | null;
}

interface Comment {
  id: number;
  postId: number;
  parentCommentId: number | null;
  body: string;
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

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CommunityDetail() {
  const [, params] = useRoute("/community/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const postId = parseInt(params?.id ?? "0", 10);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const reload = () => {
    setLoading(true);
    fetch(`/api/community/posts/${postId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setPost(d.post);
          setComments(d.comments ?? []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!postId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // 코드블록에 복사 버튼 자동 부착
  useEffect(() => {
    if (!post?.bodyHtml) return;
    const pres = document.querySelectorAll<HTMLPreElement>(".post-body pre");
    const cleanups: Array<() => void> = [];

    pres.forEach((pre) => {
      if (pre.dataset.copyAttached) return;
      pre.dataset.copyAttached = "true";
      pre.style.position = "relative";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "복사";
      btn.style.cssText =
        "position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.08);color:#cbd5e1;font-size:11px;font-weight:600;padding:4px 10px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.12);transition:all .15s ease;";
      const onClick = async () => {
        const text = pre.innerText.replace(/^복사$/m, "").trim();
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "복사됨 ✓";
          btn.style.background = "rgba(99,102,241,0.2)";
          btn.style.color = "#a5b4fc";
          setTimeout(() => {
            btn.textContent = "복사";
            btn.style.background = "rgba(255,255,255,0.08)";
            btn.style.color = "#cbd5e1";
          }, 1500);
        } catch {
          btn.textContent = "복사 실패";
        }
      };
      btn.addEventListener("click", onClick);
      pre.appendChild(btn);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        if (btn.parentNode) btn.parentNode.removeChild(btn);
        delete pre.dataset.copyAttached;
      });
    });

    return () => cleanups.forEach((c) => c());
  }, [post?.bodyHtml]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingComment) return;
    if (commentBody.trim().length === 0) return;

    setSubmittingComment(true);
    const headers = await authHeaders();
    const res = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    setSubmittingComment(false);

    if (res.ok) {
      setCommentBody("");
      reload();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d?.error ?? "댓글 작성 실패");
    }
  };

  const deletePost = async () => {
    if (!confirm("이 글을 정말 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingPost(true);
    const headers = await authHeaders();
    const res = await fetch(`/api/community/posts/${postId}`, {
      method: "DELETE",
      headers,
    });
    setDeletingPost(false);
    if (res.ok) {
      navigate("/community");
    } else {
      alert("삭제 실패");
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    const headers = await authHeaders();
    const res = await fetch(`/api/community/comments/${commentId}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) reload();
    else alert("삭제 실패");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-[#8b8f98] animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[#8b8f98] mb-4">게시글을 찾을 수 없습니다.</p>
        <Link href="/community">
          <span className="text-sm text-[#6366F1] hover:underline cursor-pointer">커뮤니티 목록으로</span>
        </Link>
      </div>
    );
  }

  const canDeletePost = user && (user.id === post.authorId || user.role === "admin");

  return (
    <div className="space-y-6">
      <Link href="/community">
        <span className="inline-flex items-center gap-1.5 text-sm text-[#8b8f98] hover:text-[#6366F1] transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> 커뮤니티 목록
        </span>
      </Link>

      <article className="glass-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[#111318] mb-4 leading-snug">{post.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#eef0f3]">
          <div className="flex items-center gap-2 text-sm">
            {post.authorAvatarUrl ? (
              <img src={post.authorAvatarUrl} alt={post.authorName ?? ""} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30" />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#111318] font-medium">{post.authorName ?? "회원"}</span>
                {post.authorRole === "admin" && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30">
                    <Shield className="h-3 w-3" /> ADMIN
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8b8f98]">
                <span>{formatRelative(post.createdAt)}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.viewCount}</span>
              </div>
            </div>
          </div>

          {canDeletePost && (
            <button
              onClick={deletePost}
              disabled={deletingPost}
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              data-testid="btn-delete-post"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          )}
        </div>

        {post.bodyHtml ? (
          <div
            className="post-body prose max-w-none text-[#111318] prose-headings:text-[#111318] prose-strong:text-[#111318] prose-a:text-[#6366F1] prose-code:bg-[#f7f8fa] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#6366F1] prose-code:before:hidden prose-code:after:hidden prose-pre:bg-[#0f172a] prose-pre:text-[#e2e8f0] prose-pre:rounded-lg prose-pre:p-4 prose-img:rounded-lg prose-img:my-4"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />
        ) : (
          <p className="text-[#111318] whitespace-pre-line leading-relaxed">{post.body}</p>
        )}
      </article>

      {/* Comments */}
      <section className="glass-card p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#111318] mb-5">
          <MessageSquare className="h-4 w-4 text-[#6366F1]" />
          댓글 {comments.length}
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-[#8b8f98] mb-5">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
        ) : (
          <ul className="space-y-4 mb-6">
            {comments.map((c) => {
              const canDelete = user && (user.id === c.authorId || user.role === "admin");
              return (
                <li key={c.id} className="border-l-2 border-[#e5e7eb] pl-4" data-testid={`comment-${c.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-xs">
                      {c.authorAvatarUrl ? (
                        <img src={c.authorAvatarUrl} alt={c.authorName ?? ""} className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30" />
                      )}
                      <span className="text-[#111318] font-medium">{c.authorName ?? "회원"}</span>
                      {c.authorRole === "admin" && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30">
                          <Shield className="h-2.5 w-2.5" /> ADMIN
                        </span>
                      )}
                      <span className="text-[#a0a4ab]">{formatRelative(c.createdAt)}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-xs text-rose-600/70 hover:text-rose-700 transition-colors"
                        aria-label="댓글 삭제"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[#484d57] whitespace-pre-line">{c.body}</p>
                </li>
              );
            })}
          </ul>
        )}

        {user ? (
          <form onSubmit={submitComment} className="space-y-2">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="댓글을 입력하세요"
              rows={3}
              maxLength={5000}
              className="w-full px-4 py-3 rounded-xl bg-[#f7f8fa] border border-[#e5e7eb] text-[#111318] text-sm placeholder:text-[#a0a4ab] focus:outline-none focus:border-[#6366F1]/50 focus:bg-[#eef0f3] transition-colors resize-none"
              data-testid="input-comment-body"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment || commentBody.trim().length === 0}
                className="inline-flex items-center gap-1.5 bg-[#6366F1] text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-[#818CF8] transition-all cursor-pointer disabled:opacity-50"
                data-testid="btn-submit-comment"
              >
                {submittingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> 댓글 등록
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 border-t border-[#eef0f3]">
            <Link href="/login">
              <span className="text-sm text-[#6366F1] hover:underline cursor-pointer">로그인하고 댓글 작성하기</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
