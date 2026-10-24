/**
 * Sandbox controls — /dashboard/sandbox
 * Simulate payments, advance settlements, replay webhooks.
 * All operations are simulated. No real money moves.
 */
import { useState } from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Link } from "react-router";
import { usePaymentLinks, useSimulatePayment } from "../../api/hooks.ts";
import {
  Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageSkeleton,
  SimulatedTag, StatusBadge,
} from "../../components/ui.tsx";
import { useToast, errorMessage } from "../../components/toast.tsx";
import { formatMoney } from "../../lib/money.ts";

export function SandboxPage() {
  const { data: links, isLoading, isError, error, refetch } = usePaymentLinks();

  if (isLoading) return <PageSkeleton label="Loading sandbox" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const openLinks = (links ?? []).filter((l) => l.status === "open");

  return (
    <div>
      <PageHeader
        title="Sandbox controls"
        description="Simulate payments and test the end-to-end flow. All operations are simulated."
      />

      {/* Warning banner */}
      <div className="mb-6 rounded-lg border border-warning/25 bg-warning/5 px-4 py-3 text-sm">
        <p className="font-medium text-warning-fg">Sandbox mode</p>
        <p className="mt-0.5 text-text-secondary">
          These controls simulate bank events. No real money moves.
        </p>
      </div>

      {/* Simulate payments */}
      <Card>
        <CardHeader
          title="Simulate a payment"
          description="Pick an open payment link and choose an outcome. The simulator runs the same handler a real bank event would use."
        />
        {openLinks.length === 0 ? (
          <EmptyState
            title="No open payment links"
            description="Create a payment link first, then come back here to simulate a payment."
            action={
              <Link
                to="/dashboard/links"
                className="inline-flex h-8 items-center gap-2 rounded-md bg-brand-600 px-3 text-[13px] font-medium text-white shadow-xs hover:bg-brand-700"
              >
                Go to Payment Links
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {openLinks.map((link) => (
              <SimulateRow key={link.id} token={link.token} description={link.description} clientName={link.client_name} amount={formatMoney(link.amount.amount_minor, link.amount.currency)} status={link.status} />
            ))}
          </div>
        )}
      </Card>

      {/* Demo flow */}
      <Card className="mt-6">
        <CardHeader title="Demo flow" description="Follow these steps for a complete walkthrough." />
        <div className="px-5 py-5">
          <ol className="space-y-4">
            {[
              { step: 1, text: <>Create a payment link from the <Link to="/dashboard/links" className="font-medium text-brand-600 underline-offset-2 hover:underline">Payment Links</Link> page.</> },
              { step: 2, text: <>Open the payer page and submit a payment, or use the <strong>Success</strong> button above.</> },
              { step: 3, text: <>Check <Link to="/dashboard/payments" className="font-medium text-brand-600 underline-offset-2 hover:underline">Payments</Link>, <Link to="/dashboard/settlements" className="font-medium text-brand-600 underline-offset-2 hover:underline">Settlements</Link>, and <Link to="/dashboard/documents" className="font-medium text-brand-600 underline-offset-2 hover:underline">Documents</Link> to see the result.</> },
              { step: 4, text: <>Check <Link to="/dashboard/developers" className="font-medium text-brand-600 underline-offset-2 hover:underline">Developers → Delivery log</Link> to see simulated webhook events.</> },
            ].map(({ step, text }) => (
              <li key={step} className="flex gap-3 text-sm text-text-primary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {step}
                </span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-text-secondary">
            Everything here is sandbox. No real money moves.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ── Simulate row ────────────────────────────────────────────── */
function SimulateRow({
  token,
  description,
  clientName,
  amount,
  status,
}: {
  token: string;
  description: string;
  clientName: string;
  amount: string;
  status: string;
}) {
  const [activeToken, setActiveToken] = useState(token);
  const simulate = useSimulatePayment(activeToken);
  const toast = useToast();

  const fire = (outcome: "success" | "decline" | "pending") => {
    setActiveToken(token);
    simulate.mutate(
      { input: { outcome, method: "card" }, eventId: crypto.randomUUID() },
      {
        onSuccess: () => {
          const msgs = {
            success: "Payment succeeded! Settlement created (simulated).",
            decline: "Payment declined (simulated).",
            pending: "Payment pending — advance it from the dashboard.",
          };
          toast.success("Simulated", msgs[outcome]);
        },
        onError: (e) => toast.error("Simulation failed", errorMessage(e)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{description}</p>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          {clientName} · <span className="tnum">{amount}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={status} />
          <SimulatedTag />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={() => fire("success")} disabled={simulate.isPending}>
          <CheckCircle className="h-3.5 w-3.5" aria-hidden /> Success
        </Button>
        <Button size="sm" variant="secondary" onClick={() => fire("decline")} disabled={simulate.isPending}>
          <XCircle className="h-3.5 w-3.5" aria-hidden /> Decline
        </Button>
        <Button size="sm" variant="secondary" onClick={() => fire("pending")} disabled={simulate.isPending}>
          <Clock className="h-3.5 w-3.5" aria-hidden /> Pending
        </Button>
      </div>
    </div>
  );
}
