import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Home, Video, PlaySquare, GraduationCap, Download, GitBranch, Settings, Menu, X, Clapperboard, LogIn, LogOut, User as UserIcon, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/community", label: "커뮤니티" },
  { href: "/techtree", label: "다시보기 / 테크트리" },
  { href: "/lives", label: "라이브 신청" },
  { href: "/resources", label: "무료 자료" },
  { href: "/courses", label: "유료 강의" },
];

const navIcons: Record<string, typeof Home> = {
  "/": Home,
  "/techtree": GitBranch,
  "/lives": Video,
  "/replays": PlaySquare,
  "/community": MessageSquare,
  "/resources": Download,
  "/courses": GraduationCap,
  "/video-factory": Clapperboard,
  "/admin": Settings,
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" data-testid="nav-home">
            <span className="text-xl font-black text-[#6366F1] tracking-tight">윤자동</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-[#8b8f98] border border-[#e5e7eb] rounded px-1.5 py-0.5">클래스</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[#6366F1]/12 text-[#6366F1]"
                        : "text-[#484d57] hover:text-[#111318] hover:bg-[#f7f8fa]"
                    }`}
                    data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!loading && (user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-[#f7f8fa] transition-colors"
                  data-testid="nav-profile"
                  aria-label="프로필 메뉴"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name ?? user.email} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-[#6366F1]" />
                    </div>
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl overflow-hidden shadow-lg border border-[#e5e7eb] z-50">
                    <div className="px-4 py-3 border-b border-[#eef0f3]">
                      <div className="text-sm font-semibold text-[#111318] truncate">{user.name ?? "회원"}</div>
                      <div className="text-xs text-[#8b8f98] truncate">{user.email}</div>
                      {user.role === "admin" && (
                        <span className="inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30">ADMIN</span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        setProfileOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#484d57] hover:bg-[#f7f8fa] transition-colors"
                      data-testid="btn-logout"
                    >
                      <LogOut className="h-4 w-4" /> 로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#484d57] hover:bg-[#f7f8fa] border border-[#e5e7eb] cursor-pointer transition-all" data-testid="nav-login">
                  <LogIn className="h-3.5 w-3.5" /> <span className="hidden sm:inline">로그인</span>
                </span>
              </Link>
            ))}

            <button
              className="md:hidden p-2 rounded-lg text-[#484d57] hover:bg-[#f7f8fa]"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#e5e7eb] bg-white">
            <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = navIcons[item.href];
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <span
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? "bg-[#6366F1]/12 text-[#6366F1]" : "text-[#484d57] hover:bg-[#f7f8fa]"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {location.startsWith("/admin") || location === "/" ? (
          <div className="w-full">{children}</div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">{children}</div>
        )}
      </main>

      <footer className="border-t border-[#e5e7eb] py-8 bg-[#f7f8fa]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-[#8b8f98]">
          © 2026 윤자동 클래스. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
