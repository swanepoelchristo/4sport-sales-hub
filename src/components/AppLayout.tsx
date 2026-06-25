import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "./Logo";
import { IdleTimer } from "./IdleTimer";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  ClipboardCheck,
  Banknote,
  UserCog,
  History,
  LogOut,
  ShieldCheck,
  BarChart3,
  Headset,
  MessageCircle,
  Scissors,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Clients", icon: Building2 },
  { to: "/services", label: "Services", icon: Scissors },
  { to: "/lead-candidates", label: "New Enquiries", icon: ClipboardCheck },
  { to: "/meetings", label: "Appointments", icon: Calendar },
  { to: "/signups", label: "Payments", icon: Banknote },
  { to: "/support", label: "Booking Requests", icon: Headset },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle, adminOnly: true },
  { to: "/performance", label: "Reports", icon: BarChart3, adminOnly: true },
  { to: "/reps", label: "Stylists", icon: UserCog, adminOnly: true },
  { to: "/activity", label: "Activity", icon: History, adminOnly: true },
  { to: "/system-check", label: "System", icon: ShieldCheck, adminOnly: true },
];

export function AppLayout() {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) navigate({ to: "/login", replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const items = NAV.filter((n) => !n.adminOnly || user.role === "admin");

  return (
    <div className="min-h-screen brand-gradient-bg flex flex-col">
      <IdleTimer />
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <Logo className="h-9" />
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:inline">
              Adele Salon AI
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.full_name}</p>
              <p className="text-xs uppercase tracking-wider text-primary">{user.role}</p>
            </div>
            <button
              onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="rounded-md border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-28 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-5">
          {items.slice(0, 5).map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="border-t border-border bg-card/60 px-4 py-4 text-center text-xs text-muted-foreground">
        © 2026 Adele Salon AI. Powered by Milk Box AI.
      </footer>
    </div>
  );
}
