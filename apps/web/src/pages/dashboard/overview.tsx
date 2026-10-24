/**
 * Overview — /dashboard
 * Stat cards with real counts from the API, quick-action links.
 */
import { Link } from "react-router";
import { ArrowUpRight, CreditCard, FileText, Landmark, Link2, Plus } from "lucide-react";
import { usePaymentLinks, usePayments, useSettlements } from "../../api/hooks.ts";
import { PageHeader, SimulatedTag, StatCard } from "../../components/ui.tsx";
import { formatMoney } from "../../lib/money.ts";

export function OverviewPage() {
  const links = usePaymentLinks();
  const payments = usePayments();
  const settlements = useSettlements();

  const loading = links.isLoading || payments.isLoading;

  const totalGross = (settlements.data ?? [])
    .filter((s) => s.status === "settled")
    .reduce((acc, s) => acc + BigInt(s.net_npr.amount_minor), 0n);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your sandbox dashboard — all data is simulated."
        actions={
          <Link
            to="/dashboard/links"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700 active:bg-brand-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create link
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Payment links"
          icon={<Link2 className="h-4 w-4" aria-hidden />}
          value={links.data?.length ?? 0}
          loading={loading}
          hint={<SimulatedTag />}
        />
        <StatCard
          label="Payments"
          icon={<CreditCard className="h-4 w-4" aria-hidden />}
          value={payments.data?.length ?? 0}
          loading={loading}
          hint={<SimulatedTag />}
        />
        <StatCard
          label="Settlements"
          icon={<Landmark className="h-4 w-4" aria-hidden />}
          value={settlements.data?.length ?? 0}
          loading={settlements.isLoading}
          hint={<SimulatedTag />}
        />
        <StatCard
          label="Net settled (NPR)"
          icon={<FileText className="h-4 w-4" aria-hidden />}
          value={formatMoney(totalGross.toString(), "NPR")}
          loading={settlements.isLoading}
          hint={<SimulatedTag />}
        />
      </div>

      {/* Quick actions */}
      <h2 className="mt-8 mb-4 font-display text-base font-semibold text-text-primary">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { to: "/dashboard/links", title: "Payment links", sub: "Create and manage links", icon: Link2 },
          { to: "/dashboard/payments", title: "Payments", sub: "View simulated payments", icon: CreditCard },
          { to: "/dashboard/documents", title: "Documents", sub: "Download settlement advice", icon: FileText },
          { to: "/dashboard/sandbox", title: "Sandbox controls", sub: "Run the demo flow", icon: Landmark },
        ].map(({ to, title, sub, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-5 py-4 shadow-xs transition-all hover:border-border-hover hover:shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-secondary">{sub}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        ))}
      </div>

      {/* Sandbox notice */}
      <div className="mt-8 rounded-lg border border-warning/25 bg-warning/5 px-4 py-3 text-sm">
        <p className="font-medium text-warning-fg">Sandbox mode</p>
        <p className="mt-0.5 text-text-secondary">
          All transactions are simulated. No real money is moved.
        </p>
      </div>
    </div>
  );
}
