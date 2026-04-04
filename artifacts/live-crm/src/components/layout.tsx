import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Video, PlaySquare, GraduationCap, Download, Settings, Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/lives", label: "라이브 신청" },
  { href: "/replays", label: "다시보기" },
  { href: "/resources", label: "무료 자료" },
  { href: "/courses", label: "유료 강의" },
];

const navIcons: Record<string, typeof Home> = {
  "/": Home,
  "/lives": Video,
  "/replays": PlaySquare,
  "/resources": Download,
  "/courses": GraduationCap,
  "/admin": Settings,
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation — Glass Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(0,50,51,0.8)] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" data-testid="nav-home">
            <span className="text-xl font-black text-[#CC9965] tracking-tight">윤자동</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-white/50 border border-white/15 rounded px-1.5 py-0.5">클래스</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[#CC9965]/15 text-[#CC9965]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                    data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <button
            className="md:hidden p-2 rounded-lg text-white/60 hover:bg-white/5"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[rgba(0,50,51,0.95)] backdrop-blur-xl">
            <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = navIcons[item.href];
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <span
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? "bg-[#CC9965]/15 text-[#CC9965]" : "text-white/70 hover:bg-white/5"
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

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-white/30">
          © 2026 윤자동 클래스. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
