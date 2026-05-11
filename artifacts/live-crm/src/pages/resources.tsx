import { useEffect, useState } from "react";
import { Link } from "wouter";
import * as Icons from "lucide-react";
import { ExternalLink, ArrowRight, Download, FileText } from "lucide-react";

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
  return "text-[#CC9965]";
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

export default function Resources() {
  const [resources, setResources] = useState<Resource[] | null>(null);

  useEffect(() => {
    fetch("/api/resources")
      .then((r) => (r.ok ? r.json() : { resources: [] }))
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]));
  }, []);

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
              const href = item.internalRoute || (isFile ? `${SUPABASE_STORAGE_BASE}/${item.filePath}` : item.externalUrl ?? "#");
              const cardInner = (
                <div className={`${gcHover} p-5 group block h-full`}>
                  <div className="flex items-start justify-between mb-3">
                    {item.badge && (
                      <span className={`${item.badgeColor ?? "bg-[#CC9965]"} text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full`}>
                        {item.badge}
                      </span>
                    )}
                    {isInternal ? (
                      <ArrowRight className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#CC9965] transition-colors flex-shrink-0" />
                    ) : isFile ? (
                      <Download className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#CC9965] transition-colors flex-shrink-0" />
                    ) : (
                      <ExternalLink className="h-4 w-4 text-[#a0a4ab] group-hover:text-[#CC9965] transition-colors flex-shrink-0" />
                    )}
                  </div>
                  <h3 className="font-bold text-[#111318] text-sm mb-1 group-hover:text-[#CC9965] transition-colors">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-[#8b8f98] leading-relaxed">{item.description}</p>
                  )}
                </div>
              );

              if (isInternal) {
                return <Link key={item.id} href={href}>{cardInner}</Link>;
              }
              return (
                <a
                  key={item.id}
                  href={href}
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
    </div>
  );
}
