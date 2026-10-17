/**
 * Payer page — /pay/:token
 *
 * Public page showing the invoice from the payment link looked up by token.
 * TEST MODE banner visible. No card data collected.
 */

import { useState } from "react";
import { useParams } from "react-router";
import { usePublicPaymentLink, useSimulatePayment } from "../api/hooks.ts";
import { Card, Button, Badge, LoadingRows, ErrorState } from "../components/ui.tsx";
import { formatMoney } from "../lib/money.ts";
import { formatDateOnly } from "../lib/dates.ts";
import { HimpaarMark } from "../components/brand.tsx";

export function PayerPage() {
  const { token } = useParams<{ token: string }>();
  const { data: link, isLoading, isError, error } = usePublicPaymentLink(token ?? "");
  const simulate = useSimulatePayment(token ?? "");

  const [selectedMethod, setSelectedMethod] = useState<string>("card");
  const [simulated, setSimulated] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  const methods = [
    { id: "card" as const, label: "Card", sublabel: "Simulated. No card data is collected." },
    { id: "ach" as const, label: "ACH", sublabel: "Simulated" },
    { id: "sepa" as const, label: "SEPA", sublabel: "Simulated" },
    { id: "swift" as const, label: "SWIFT", sublabel: "Simulated" },
  ];

  const handleSimulate = (result: "success" | "decline" | "pending") => {
    simulate.mutate(
      { input: { outcome: result, method: selectedMethod as "card" | "ach" | "sepa" | "swift" }, eventId: crypto.randomUUID() },
      {
        onSuccess: () => {
          setSimulated(true);
          setOutcome(result);
        },
        onError: () => {
          setSimulated(true);
          setOutcome("error");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TEST MODE banner */}
      <div className="bg-warning/15 text-warning-fg text-center py-2 text-sm font-semibold border-b border-warning/30">
        ⚠ TEST MODE — Simulated payment, no real money moves
      </div>

      <div className="max-w-lg mx-auto p-6 pt-10">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HimpaarMark className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-semibold text-slate-900">Himpaar</span>
          </div>
          <Badge tone="warning">Sandbox — Test Mode</Badge>
        </div>

        {isLoading && <LoadingRows />}
        {isError && <ErrorState error={error} />}
        {!isLoading && !isError && !link && (
          <Card className="text-center py-12">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Payment link not found</h2>
            <p className="text-sm text-slate-500">
              This payment link does not exist or has expired.
            </p>
          </Card>
        )}

        {link && simulated ? (
          <Card className="text-center">
            <div className="py-8">
              {outcome === "success" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Payment simulated successfully
                  </h2>
                  <p className="text-sm text-slate-500">
                    This was a simulated payment. No real money was charged.
                  </p>
                </>
              ) : outcome === "decline" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Payment declined (simulated)
                  </h2>
                  <p className="text-sm text-slate-500">No real money was involved.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Payment pending (simulated)
                  </h2>
                  <p className="text-sm text-slate-500">
                    The payment is pending. In a real flow, the bank would confirm it.
                  </p>
                </>
              )}
            </div>
          </Card>
        ) : link ? (
          <Card>
            <div className="border-b border-slate-200 pb-4 mb-4">
              <p className="text-sm text-slate-500">Invoice from</p>
              <p className="text-lg font-semibold text-slate-900">{link.merchant_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-slate-500">Reference</p>
                <p className="font-medium text-slate-800">{link.reference}</p>
              </div>
              <div>
                <p className="text-slate-500">Due date</p>
                <p className="font-medium text-slate-800">{formatDateOnly(link.due_date)}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-slate-500 text-sm">Description</p>
              <p className="text-slate-800">{link.description}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Amount due</span>
                <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {formatMoney(link.amount.amount_minor, link.amount.currency)}
                </span>
              </div>
            </div>

            {link.status !== "open" ? (
              <div className="text-center py-4">
                <Badge tone={link.status === "paid" ? "success" : "danger"}>
                  {link.status === "paid" ? "Already paid" : link.status === "expired" ? "Expired" : "Cancelled"}
                </Badge>
                <p className="mt-2 text-sm text-slate-500">
                  This payment link is no longer available.
                </p>
              </div>
            ) : (
              <>
                {/* Payment method selection */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-slate-700 mb-3">Pay with</p>
                  <div className="grid grid-cols-2 gap-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMethod(m.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedMethod === m.id
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-800">{m.label}</p>
                        <p className="text-xs text-slate-500">{m.sublabel}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  Simulated. No card data is collected. No real money will be charged.
                </p>

                {/* Simulate buttons */}
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => handleSimulate("success")} disabled={simulate.isPending}>
                    Simulate: Success
                  </Button>
                  <Button variant="secondary" onClick={() => handleSimulate("decline")} disabled={simulate.isPending}>
                    Decline
                  </Button>
                  <Button variant="secondary" onClick={() => handleSimulate("pending")} disabled={simulate.isPending}>
                    Pending
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-400">
          Sandbox preview. All payments, rates and documents are simulated. No real money moves.
        </p>
      </div>
    </div>
  );
}
