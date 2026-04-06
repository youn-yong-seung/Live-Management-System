import { ExternalLink, BookOpen, Download, GraduationCap, FileText, Crown, Zap, MessageCircle } from "lucide-react";

const gcHover = "glass-card hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300";

interface Resource {
  title: string;
  description: string;
  url: string;
  badge?: string;
  badgeColor?: string;
}

interface ResourceSection {
  title: string;
  description: string;
  icon: typeof BookOpen;
  iconColor: string;
  items: Resource[];
}

const SECTIONS: ResourceSection[] = [
  {
    title: "자동화 프로그램",
    description: "비즈니스에 바로 적용할 수 있는 자동화 프로그램",
    icon: Zap,
    iconColor: "text-emerald-400",
    items: [
      {
        title: "N플레이스 자동 리뷰 답글 프로그램",
        description: "자영업자 전용 — AI가 네이버 플레이스 리뷰에 자동으로 답글을 달아줍니다. 200분 이상 사용 중!",
        url: "https://www.yunjadong.com/shop_view?idx=127",
        badge: "무료",
        badgeColor: "bg-emerald-500",
      },
      {
        title: "카카오톡 자동 발송기 프로그램",
        description: "단톡방 단체 발송, 예약 발송, 파일 첨부까지. 7일 무료 체험으로 모든 기능을 사용해보세요.",
        url: "https://www.yunjadong.com/shop_view?idx=66",
        badge: "7일 무료",
        badgeColor: "bg-sky-500",
      },
    ],
  },
  {
    title: "노션 템플릿",
    description: "바로 복제해서 쓸 수 있는 노션 템플릿 모음",
    icon: BookOpen,
    iconColor: "text-purple-400",
    items: [
      {
        title: "할 일 관리 템플릿 Basic",
        description: "심플하고 깔끔한 할 일 관리 노션 템플릿",
        url: "https://www.yunjadong.com/shop_view?idx=156",
        badge: "무료",
        badgeColor: "bg-emerald-500",
      },
      {
        title: "가계부 템플릿 Basic",
        description: "간편하게 수입/지출을 관리하는 노션 가계부",
        url: "https://www.yunjadong.com/shop_view/?idx=160",
        badge: "무료",
        badgeColor: "bg-emerald-500",
      },
      {
        title: "할 일 관리 템플릿 PRO",
        description: "프로페셔널한 업무 관리를 위한 프리미엄 템플릿",
        url: "https://www.yunjadong.com/shop_view?idx=150",
        badge: "PRO",
        badgeColor: "bg-[#CC9965]",
      },
      {
        title: "노션 왕초보를 위한 템플릿 12종",
        description: "입문자를 위한 다양한 템플릿 12종 세트",
        url: "https://www.yunjadong.com/shop_view?idx=153",
        badge: "인기",
        badgeColor: "bg-blue-500",
      },
    ],
  },
  {
    title: "노션 강의 & 가이드",
    description: "노션을 체계적으로 배울 수 있는 강의와 가이드",
    icon: GraduationCap,
    iconColor: "text-sky-400",
    items: [
      {
        title: "프락의 노션 왕초보 영상 강의",
        description: "처음 시작하는 분들을 위한 영상 강의 시리즈",
        url: "https://www.yunjadong.com/shop_view/?idx=159",
        badge: "강의",
        badgeColor: "bg-indigo-500",
      },
      {
        title: "할 일 관리 PRO 템플릿 사용방법",
        description: "PRO 템플릿 200% 활용 가이드 (20+ 페이지)",
        url: "https://yunjadong.notion.site/20-2cdec2501aa1808bb7dfdcf74f91dbc8?source=copy_link",
        badge: "가이드",
        badgeColor: "bg-amber-500",
      },
    ],
  },
  {
    title: "무료 전자책",
    description: "무료로 다운받을 수 있는 전자책 & 자료",
    icon: FileText,
    iconColor: "text-emerald-400",
    items: [
      {
        title: "노션 왕초보를 위한 무료 전자책",
        description: "노션의 기초부터 차근차근 알려주는 전자책",
        url: "https://www.notion.so/yunjadong/2b8ec2501aa180eeac9ee3e98904f630?v=2b8ec2501aa180d4b80b000cef37f646",
        badge: "무료",
        badgeColor: "bg-emerald-500",
      },
    ],
  },
];

export default function Resources() {
  return (
    <div className="space-y-12">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white mb-1">무료 자료</h1>
        <p className="text-white/50 text-sm">템플릿, 전자책, 가이드 등 무료 자료를 다운받으세요.</p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
              <section.icon className={`h-4.5 w-4.5 ${section.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              <p className="text-xs text-white/40">{section.description}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {section.items.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${gcHover} p-5 group block`}
              >
                <div className="flex items-start justify-between mb-3">
                  {item.badge && (
                    <span className={`${item.badgeColor} text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full`}>
                      {item.badge}
                    </span>
                  )}
                  <ExternalLink className="h-4 w-4 text-white/20 group-hover:text-[#CC9965] transition-colors flex-shrink-0" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#CC9965] transition-colors">{item.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
