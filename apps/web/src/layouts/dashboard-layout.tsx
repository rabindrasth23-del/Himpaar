import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Code2,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Landmark,
  Link2,
  LogOut,
  Map,
  Menu,
  ShieldAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLogout, useSession } from "../api/hooks.ts";
import { HimpaarLogo } from "../components/brand.tsx";
import { Skeleton, cn } from "../components/ui.tsx";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/links", label: "Payment links", icon: Link2 },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/settlements", label: "Settlements", icon: Landmark },
  { to: "/dashboard/documents", label: "Documents", icon: FileText },
  { to: "/dashboard/developers", label: "Developers", icon: Code2 },
  { to: "/dashboard/sandbox", label: "Sandbox", icon: FlaskConical },
  { to: "/dashboard/roadmap", label: "Roadmap", icon: Map },
];

const COLLAPSE_KEY = "himpaar.sidebar.collapsed";

/** TEST MODE banner shown on every dashboard page (AGENTS.md §9). */
export function TestModeBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/12 px-4 py-1.5 text-center text-xs text-warning-fg"
    >
      <span className="rounded-sm bg-warning-fg px-1.5 py-px text-[10.5px] font-bold tracking-wider text-white">
        TEST MODE
      </span>
      <span>All payments, rates and documents are simulated. No real money moves.</span>
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Dashboard" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors duration-150",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-text-primary",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(collapsed && "sr-only")}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Route guard: redirect to /login when there is no session. */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Checking session">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }
  if (!session.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function DashboardLayout() {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const merchant = session.data?.merchant;
  const email = session.data?.user.email;

  const onLogout = () =>
    logout.mutate(undefined, { onSuccess: () => navigate("/login", { replace: true }) });

  return (
    <div className="flex min-h-dvh bg-surface-secondary">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface-elevated transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center" : "px-4")}>
          <NavLink to="/dashboard" aria-label="Himpaar overview">
            <HimpaarLogo collapsed={collapsed} />
          </NavLink>
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="space-y-0.5 border-t border-border p-2">
          <a
            href="https://github.com/standard-webhooks/standard-webhooks"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
          >
            {/* reserved */}
          </a>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-slate-100 hover:text-text-primary",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden /> : <ChevronsLeft className="h-4 w-4" aria-hidden />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-border bg-surface-elevated shadow-lg">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <HimpaarLogo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TestModeBanner />
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface-elevated/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ml-1 rounded-md p-1.5 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="lg:hidden">
            <HimpaarLogo collapsed />
          </span>
          <span className="hidden items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-warning-fg sm:inline-flex">
            TEST MODE
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-text-primary" data-testid="company-name">
                {merchant?.name ?? "—"}
              </p>
              <p className="hidden truncate text-xs text-text-secondary sm:block">{email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={logout.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        {merchant && merchant.kyc_status !== "approved_sandbox" && !location.pathname.startsWith("/dashboard/kyc") && (
          <div className="border-b border-border bg-brand-50 px-4 py-2.5 text-sm sm:px-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ShieldAlert className="h-4 w-4 text-info-fg" aria-hidden />
              <span className="text-slate-700">Company details not submitted. The KYC step is simulated and nothing is verified.</span>
              <NavLink to="/dashboard/kyc" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                Complete simulated KYC
              </NavLink>
            </div>
          </div>
        )}

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border px-4 py-4 text-center text-xs text-text-secondary sm:px-6">
          <BookOpen className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
          Himpaar sandbox. Simulated data only; not a bank and no real payments.
        </footer>
      </div>
    </div>
  );
}
