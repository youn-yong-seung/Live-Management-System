import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Video, PlaySquare, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/lives", label: "라이브 신청" },
  { href: "/replays", label: "다시보기" },
];

const navIcons: Record<string, typeof Home> = {
  "/": Home,
  "/lives": Video,
  "/replays": PlaySquare,
  "/admin": Settings,
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" data-testid="nav-home">
            <span className="text-xl font-black text-blue-600 tracking-tight">윤자동</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">클래스</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                    data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = navIcons[item.href];
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <span
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-400">
          © 2026 윤자동. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
