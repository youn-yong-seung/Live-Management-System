import { useEffect, useState } from "react";
import { Link } from "wouter";
import * as Icons from "lucide-react";
import { ExternalLink, ArrowRight, Download, FileText, X, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Resource {
  id: number;
  title: string;
  description: string | null;
  category: string;
  iconName: string | null;
  badge: string | null;
  badgeColor: string | null;
  externalUrl: string | null;
  filePath: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  internalRoute: string | null;
  displayOrder: number;
}

const SUPABASE_STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resources`;

const gcHover = "glass-card hover:bg-[#eef0f3] hover:-translate-y-1 transition-all duration-300";

function ResourceIcon({ name, className }: { name: string | null; className?: string }) {
  if (!name) return <FileText className={className} />;
  const Cmp = (Icons as any)[name];
  if (!Cmp) return <FileText className={className} />;
  return <Cmp className={className} />;
}

function groupByCategory(items: Resource[]): Record<string, Resource[]> {
  const out: Record<string, Resource[]> = {};
  for (const r of items) {
    if (!out[r.category]) out[r.category] = [];
    out[r.category].push(r);
  }
  return out;
}

function categoryIconColor(category: string): string {
  if (category.includes("자동화")) return "text-emerald-600";
  if (category.includes("템플릿")) return "text-purple-600";
  if (category.includes("강의")) return "text-sky-600";
  if (category.includes("전자책") || category.includes("PDF")) return "text-emerald-600";
  return "text-[#6366F1]";
}

function categoryIconName(category: string): string {
  if (category.includes("자동화")) return "Zap";
  if (category.includes("템플릿")) return "BookOpen";
  if (category.includes("강의")) return "GraduationCap";
  if (category.includes("전자책") || category.includes("PDF")) return "FileText";
  return "FileText";
}

function categoryDescription(category: string): string {
  if (category.includes("자동화")) return "비즈니스에 바로 적용할 수 있는 자동화 프로그램";
  if (category.includes("템플릿")) return "바로 복제해서 쓸 수 있는 노션 템플릿 모음";
  if (category.includes("강의")) return "노션을 체계적으로 배울 수 있는 강의와 가이드";
  if (category.includes("전자책") || category.includes("PDF")) return "무료로 다운받을 수 있는 전자책 & PDF 가이드";
  return "";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function Resources() {
  const { user, signInWithGoogle } = useAuth();
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [gatedResource, setGatedResource] = useState<Resource | null>(null);

  useEffect(() => {
    fetch("/api/resources")
      .then((r) => (r.ok ? r.json() : { resources: [] }))
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]));
  }, []);

  const triggerFileDownload = (item: Resource) => {
    fetch(`/api/resources/${item.id}/download`, { method: "POST" }).catch(() => undefined);
    window.open(`${SUPABASE_STORAGE_BASE}/${item.filePath}`, "_blank");
  };

  if (resources === null) {
    return (
      <div className="space-y-8 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-[#111318] mb-1">무료 자료</h1>
          <p className="text-[#8b8f98] text-sm">로딩 중...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 w-2/3 bg-[#eef0f3] rounded mb-2" />
              <div className="h-3 w-1/3 bg-[#eef0f3] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groups = groupByCategory(resources);
  const categories = Object.keys(groups);

  return (
    <div className="space-y-12">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-[#111318] mb-1">무료 자료</h1>
        <p className="text-[#8b8f98] text-sm">템플릿, 전자책, 가이드 등 무료 자료를 다운받으세요.</p>
      </div>

      {categories.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText className="h-10 w-10 text-[#a0a4ab] mx-auto mb-4" />
          <p className="text-[#8b8f98] text-sm">등록된 자료가 없습니다.</p>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#f7f8fa] border border-[#e5e7eb]">
              <ResourceIcon name={categoryIconName(cat)} className={`h-4.5 w-4.5 ${categoryIconColor(cat)}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111318]">{cat}</h2>
              <p className="text-xs text-[#8b8f98]">{categoryDescription(cat)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {groups[cat].map((item) => {
              const isInternal = !!item.internalRoute;
              const isFile = !!item.filePath;
              const cardInner = (
                <div className={`${gcHover} p-5 group block h-full`}>
                  <div className="flex items-start justify-between mb-3">
                    {item.badge && (
                      <span className={`${item.badgeColor ?? "bg-[#6366F1]"} text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full`}>
                        {item.badge}
                      </span>
                    )}
                    {isInternal ? (
                      <ArrowRight className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#6366F1] transition-colors flex-shrink-0" />
                    ) : isFile ? (
                      <Download className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#6366F1] transition-colors flex-shrink-0" />
                    ) : (
                      <ExternalLink className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#6366F1] transition-colors flex-shrink-0" />
                    )}
                  </div>
                  <h3 className="font-bold text-[#111318] text-sm mb-1 group-hover:text-[#6366F1] transition-colors">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-[#8b8f98] leading-relaxed">{item.description}</p>
                  )}
                </div>
              );

              if (isInternal) {
                return <Link key={item.id} href={item.internalRoute!}>{cardInner}</Link>;
              }
              if (isFile) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="text-left"
                    onClick={() => {
                      if (user) {
                        triggerFileDownload(item);
                      } else {
                        setGatedResource(item);
                      }
                    }}
                  >
                    {cardInner}
                  </button>
                );
              }
              return (
                <a
                  key={item.id}
                  href={item.externalUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch(`/api/resources/${item.id}/download`, { method: "POST" }).catch(() => undefined);
                  }}
                >
                  {cardInner}
                </a>
              );
            })}
          </div>
        </div>
      ))}

      {gatedResource && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setGatedResource(null)}
        >
          <div
            className="bg-white max-w-md w-full p-7 rounded-md border border-[#e5e7eb]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setGatedResource(null)}
              className="absolute right-6 mt-[-8px] text-[#8b8f98] hover:text-[#111318]"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[#eef2ff] mb-4">
              <Sparkles className="h-6 w-6 text-[#6366F1]" />
            </div>
            <h3 className="text-lg font-bold text-[#111318] mb-2">잠깐, 회원이 되시면…</h3>
            <p className="text-sm text-[#484d57] leading-relaxed mb-5">
              <span className="font-semibold text-[#111318]">{gatedResource.title}</span> 자료 + 매주 새로 풀리는 다른 자료까지 모두 무료로 받아가실 수 있어요. Google 한 번 클릭이면 끝.
            </p>

            <ul className="space-y-2 mb-6 text-sm">
              <li className="flex items-center gap-2 text-[#484d57]">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                매주 새 PDF·템플릿 무료
              </li>
              <li className="flex items-center gap-2 text-[#484d57]">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                지난 라이브 다시보기 100% 무료
              </li>
              <li className="flex items-center gap-2 text-[#484d57]">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                커뮤니티에서 프롬프트·코드 공유
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  setGatedResource(null);
                  await signInWithGoogle();
                }}
                className="w-full flex items-center justify-center gap-3 bg-white border border-[#e5e7eb] hover:bg-[#f7f8fa] text-[#111318] font-semibold text-sm px-5 py-3 rounded-md transition-all"
              >
                <GoogleIcon />
                Google로 1초 가입하고 받기
              </button>
              <button
                onClick={() => {
                  if (gatedResource) triggerFileDownload(gatedResource);
                  setGatedResource(null);
                }}
                className="text-xs text-[#8b8f98] hover:text-[#484d57] py-2 transition-colors"
              >
                일단 비회원으로 받기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
