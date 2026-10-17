/**
 * Sandbox controls — simulate payments.
 * Sandbox mode only. All operations are simulated.
 */

import { useState } from "react";
import { usePaymentLinks, useSimulatePayment } from "../../api/hooks.ts";
import {
  PageHeader, Card, Button, StatusBadge, LoadingRows, ErrorState, SimulatedTag,
} from "../../components/ui.tsx";
import { formatMoney } from "../../lib/money.ts";

export function SandboxPage() {
  const { data: links, isLoading, isError, error, refetch } = usePaymentLinks();
  const [selectedToken, setSelectedToken] = useState<string>("__none__");
  const simulate = useSimulatePayment(selectedToken);
  const [result, setResult] = useState<string | null>(null);

  const openLinks = (links ?? []).filter((l) => l.status === "open");

  const handleSimulate = (token: string, outcome: "success" | "decline" | "pending") => {
    setSelectedToken(token);
    setResult(null);
    simulate.mutate(
      { input: { outcome, method: "card" }, eventId: crypto.randomUUID() },
      {
        onSuccess: () => {
          const msg = outcome === "success"
            ? "Payment succeeded! Settlement created (simulated)"
            : outcome === "decline"
            ? "Payment declined (simulated)"
            : "Payment pending — use the dashboard to advance it (simulated)";
          setResult(msg);
        },
        onError: (err) => {
          setResult(`Error: ${err.message}`);
        },
      }
    );
  };

  if (isLoading) return <LoadingRows />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sandbox Controls"
        description="Simulate payments and test the end-to-end flow. All operations are simulated."
      />

      <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
        <p className="text-sm text-warning-fg font-medium">
          ⚠ Sandbox mode only. These controls simulate bank events. No real money moves.
        </p>
      </div>

      {result && (
        <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
          <p className="text-sm text-brand-800">{result}</p>
        </div>
      )}

      {/* Simulate Payment */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Simulate a Payment
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Choose an open payment link and an outcome. The simulator creates a signed bank event
          and processes it through the same handler a real bank event would use.
        </p>

        {openLinks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            No open payment links. Create one from the Payment Links page first.
          </p>
        ) : (
          <div className="space-y-4">
            {openLinks.map((link) => (
              <div
                key={link.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{link.description}</p>
                    <p className="text-sm text-slate-500">
                      {link.client_name} · {formatMoney(link.amount.amount_minor, link.amount.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={link.status} />
                      <SimulatedTag />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSimulate(link.token, "success")}
                      disabled={simulate.isPending}
                    >
                      Success
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSimulate(link.token, "decline")}
                      disabled={simulate.isPending}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSimulate(link.token, "pending")}
                      disabled={simulate.isPending}
                    >
                      Pending
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Demo flow */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Demo Flow
        </h2>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>Create a payment link from the <strong>Payment Links</strong> page.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>Click <strong>Success</strong> above to simulate a successful payment.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>Check the <strong>Payments</strong>, <strong>Settlements</strong>, and <strong>Documents</strong> pages to see the result.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <span>Check <strong>Developers → Webhook Deliveries</strong> to see the simulated webhook events.</span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          Everything here is sandbox. No real money moves.
        </p>
      </Card>
    </div>
  );
}
