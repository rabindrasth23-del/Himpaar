import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Landmark,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAdminLogout, useAdminSession } from "../api/hooks.ts";
import { HimpaarLogo } from "../components/brand.tsx";
import { Skeleton, cn } from "../components/ui.tsx";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Overview", icon: BarChart3, end: true },
  { to: "/admin/merchants", label: "Merchants", icon: Store },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/settlements", label: "Settlements", icon: Landmark },
  { to: "/admin/audit", label: "Activity log", icon: ScrollText },
];

const COLLAPSE_KEY = "himpaar.admin.sidebar.collapsed";

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
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
                ? "bg-danger/8 text-danger-fg"
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

/** Route guard: redirect to /admin/login when not an admin. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const session = useAdminSession();
  const location = useLocation();
  if (session.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Checking admin session">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }
  if (!session.data) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function AdminLayout() {
  const session = useAdminSession();
  const logout = useAdminLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const admin = session.data?.admin;

  const onLogout = () =>
    logout.mutate(undefined, { onSuccess: () => navigate("/admin/login", { replace: true }) });

  return (
    <div className="flex min-h-dvh bg-surface-secondary">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-surface-elevated focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface-elevated transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center" : "px-4")}>
          <NavLink to="/admin" aria-label="Admin overview">
            <HimpaarLogo collapsed={collapsed} />
          </NavLink>
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="space-y-0.5 border-t border-border p-2">
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
          <aside
            aria-label="Menu"
            className="relative flex h-full w-64 flex-col border-r border-border bg-surface-elevated shadow-lg"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <HimpaarLogo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Admin banner */}
        <div
          role="note"
          className="flex items-center justify-center gap-2 border-b border-danger/30 bg-danger/8 px-4 py-1.5 text-center text-xs text-danger-fg"
        >
          <Shield className="h-3.5 w-3.5" aria-hidden />
          <span className="rounded-sm bg-danger-fg px-1.5 py-px text-[10.5px] font-bold tracking-wider text-white">
            ADMIN CONSOLE
          </span>
          <span>You are viewing the internal admin panel. Changes take effect immediately.</span>
        </div>

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface-elevated/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ml-1 rounded-md p-1.5 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <span className="lg:hidden">
            <HimpaarLogo collapsed />
          </span>
          <span className="hidden items-center rounded-full border border-danger/40 bg-danger/8 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-danger-fg sm:inline-flex">
            <Activity className="mr-1.5 h-3 w-3" aria-hidden />
            ADMIN
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-text-primary">{admin?.name ?? "—"}</p>
              <p className="hidden truncate text-xs text-text-secondary sm:block">{admin?.email}</p>
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

        <main id="admin-main" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border px-4 py-4 text-center text-xs text-text-secondary sm:px-6">
          <Shield className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
          Himpaar Admin Console — Internal use only
        </footer>
      </div>
    </div>
  );
}
