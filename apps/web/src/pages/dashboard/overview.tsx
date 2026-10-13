import { Link2, CreditCard, Landmark, ArrowUpRight } from "lucide-react";

const stats = [
  { label: "Payment Links", value: "—", icon: Link2, href: "/payment-links" },
  { label: "Payments", value: "—", icon: CreditCard, href: "/payments" },
  { label: "Settlements", value: "—", icon: Landmark, href: "/settlements" },
] as const;

export function OverviewPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Overview</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome to Himpaar. Your sandbox dashboard.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            className="group flex items-start justify-between rounded-xl border border-border bg-surface-elevated p-5 shadow-card transition-all hover:border-border-hover hover:shadow-md"
          >
            <div>
              <p className="text-sm font-medium text-text-secondary">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
                {value}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
              <Icon className="h-5 w-5" />
            </div>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-text-primary">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="/payment-links"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-xs transition-all hover:border-border-hover hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Link2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Create Payment Link
              </p>
              <p className="text-xs text-text-muted">
                Generate a link for your customer to pay
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-text-muted" />
          </a>
          <a
            href="/api-keys"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-xs transition-all hover:border-border-hover hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Manage API Keys
              </p>
              <p className="text-xs text-text-muted">
                Create keys for SDK integration
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-text-muted" />
          </a>
        </div>
      </div>

      {/* Sandbox notice */}
      <div className="mt-8 rounded-xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-medium text-warning">Sandbox Mode</p>
        <p className="mt-1 text-sm text-text-secondary">
          You are in test mode. All transactions are simulated and no real money is
          moved.
        </p>
      </div>
    </>
  );
}
