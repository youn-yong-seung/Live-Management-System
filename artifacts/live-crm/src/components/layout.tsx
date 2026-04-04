import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Video, PlaySquare, Settings, Menu, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/lives", label: "라이브 신청", icon: Video },
  { href: "/replays", label: "다시보기", icon: PlaySquare },
  { href: "/admin", label: "관리자", icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 60000 } });

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className="block">
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`nav-${item.href.replace("/", "") || "home"}`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row dark">
      {/* Mobile Nav */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="font-bold text-lg text-primary tracking-tight">YUNBISEO</div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-card border-r-border p-6 flex flex-col gap-6">
            <div className="font-bold text-2xl text-primary tracking-tight">YUNBISEO</div>
            <nav className="flex flex-col gap-2 flex-1">
              <NavLinks />
            </nav>
            <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-border">
              <Activity className="h-3 w-3" />
              <span>Status: {health?.status === 'ok' ? 'Online' : 'Checking...'}</span>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card min-h-screen fixed top-0 left-0">
        <div className="p-6 flex flex-col h-full">
          <div className="font-bold text-2xl text-primary tracking-tight mb-8">YUNBISEO</div>
          <nav className="flex flex-col gap-2 flex-1">
            <NavLinks />
          </nav>
          <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/50">
            <div className={`h-2 w-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>System {health?.status === 'ok' ? 'Online' : 'Checking...'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
