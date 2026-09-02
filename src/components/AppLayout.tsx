import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "./Logo";
import { IdleTimer } from "./IdleTimer";
import mascot from "@/assets/4sport-whistle-mascot.webp";
import {
  LayoutDashboard, Calendar, Building2, ClipboardCheck, Banknote, UserCog,
  History, LogOut, ShieldCheck, BarChart3, Headset, MessageCircle, Globe2,
  Megaphone, FileText, ExternalLink,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; backOfficeOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/impact", label: "Impact", icon: Globe2, backOfficeOnly: true },
  { to: "/leads", label: "Leads", icon: Building2 },
  { to: "/lead-candidates", label: "Research Inbox", icon: ClipboardCheck },
  { to: "/meetings", label: "Meetings", icon: Calendar },
  { to: "/signups", label: "Signups", icon: Banknote },
  { to: "/rep-documents", label: "Documents", icon: FileText },
  { to: "/support", label: "Support", icon: Headset },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle, backOfficeOnly: true },
  { to: "/marketing", label: "Marketing", icon: Megaphone, backOfficeOnly: true },
  { to: "/performance", label: "Performance", icon: BarChart3, backOfficeOnly: true },
  { to: "/reps", label: "Reps", icon: UserCog, backOfficeOnly: true },
  { to: "/activity", label: "Activity", icon: History, backOfficeOnly: true },
  { to: "/system-check", label: "System", icon: ShieldCheck, backOfficeOnly: true },
];

const FOURSPORT_APP_URL = "https://4sport.co.za";

export function AppLayout() {
  const { user, logout, dataError, mutationError, clearMutationError, reloadData } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) navigate({ to: "/login", replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const hasBackOfficeAccess = user.role === "admin";
  const items = NAV.filter((n) => !n.backOfficeOnly || hasBackOfficeAccess);

  return (
    <div className="min-h-screen brand-gradient-bg flex flex-col">
      <IdleTimer />
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <Logo className="h-9" />
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:inline">Sales Rep Dashboard</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <n.icon className="h-4 w-4" />{n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <a href={FOURSPORT_APP_URL} target="_blank" rel="noreferrer" title="Open 4SPORT for school onboarding" className="hidden items-center gap-1 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100 lg:inline-flex">
              Onboard in 4SPORT <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.full_name}</p>
              <p className="text-xs uppercase tracking-wider text-primary">{user.role}</p>
            </div>
            <button onClick={() => { logout(); navigate({ to: "/login" }); }} className="rounded-md border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground" aria-label="Sign out" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-28 md:pb-10">
        <div className="mb-4 flex justify-end lg:hidden">
          <a href={FOURSPORT_APP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">Onboard in 4SPORT <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
        {dataError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <span>{dataError}</span>
            <button type="button" onClick={() => void reloadData()} className="rounded-lg border border-destructive/40 px-3 py-1.5 font-semibold">Retry</button>
          </div>
        )}
        {mutationError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <span>Save failed. Your last change was not confirmed. {mutationError}</span>
            <button type="button" onClick={clearMutationError} className="rounded-lg border border-destructive/40 px-3 py-1.5 font-semibold">Dismiss</button>
          </div>
        )}
        <Outlet />
      </main>

      <div className="pointer-events-none fixed bottom-20 right-3 z-20 flex h-24 w-24 items-end justify-center overflow-hidden rounded-full border border-blue-200/80 bg-white/90 shadow-xl shadow-blue-950/15 backdrop-blur md:bottom-5 md:right-5 md:h-36 md:w-36" aria-hidden="true">
        <img src={mascot} alt="" className="h-[112%] w-[112%] translate-y-2 object-contain drop-shadow-md" />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl overflow-x-auto">
          {items.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon className="h-5 w-5" />{n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="border-t border-border bg-card/60 px-4 py-4 text-center text-xs text-muted-foreground">© 2026 4SPORT. All rights reserved. Created by Milk Box AI.</footer>
    </div>
  );
}
