/**
 * Payer page — /pay/:token
 *
 * Public checkout page designed after Stripe Checkout & Razorpay International.
 * Split 2-column layout on desktop:
 * - Left: Merchant branding, invoice line items, security credentials, currency display.
 * - Right: Express checkout, payment method tabs, simulated card inputs, simulation triggers.
 * AGENTS.md §9: TEST MODE banner visible on every state. No real card data collected.
 */
import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Lock,
  CreditCard,
  Building,
  Globe2,
  FileText,
  Sparkles,
} from "lucide-react";
import { usePublicPaymentLink, useSimulatePayment } from "../api/hooks.ts";
import { Badge, Button, Card, ErrorState, PageSkeleton, cn } from "../components/ui.tsx";
import { formatMoney } from "../lib/money.ts";
import { formatDateOnly } from "../lib/dates.ts";
import { HimpaarMark } from "../components/brand.tsx";
import { METHOD_LABEL } from "../lib/labels.ts";
import type { PaymentMethod } from "@himpaar/shared";

const METHODS: {
  id: PaymentMethod;
  label: string;
  sublabel: string;
  icon: typeof CreditCard;
}[] = [
  { id: "card", label: "Credit or Debit Card", sublabel: "Visa, Mastercard, Amex (simulated)", icon: CreditCard },
  { id: "ach", label: "US Bank Transfer (ACH)", sublabel: "Direct debit for US clients", icon: Building },
  { id: "sepa", label: "Euro Bank Transfer (SEPA)", sublabel: "Zero-fee Eurozone transfer", icon: Globe2 },
  { id: "swift", label: "International Wire (SWIFT)", sublabel: "Standard international bank wire", icon: FileText },
];

export function PayerPage() {
  const { token } = useParams<{ token: string }>();
  const { data: link, isLoading, isError, error } = usePublicPaymentLink(token ?? "");
  const simulate = useSimulatePayment(token ?? "");

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [done, setDone] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  const fire = (result: "success" | "decline" | "pending") => {
    simulate.mutate(
      { input: { outcome: result, method }, eventId: crypto.randomUUID() },
      {
        onSuccess: () => {
          setDone(true);
          setOutcome(result);
        },
        onError: () => {
          setDone(true);
          setOutcome("error");
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* TEST MODE Banner — Always visible per AGENTS.md §9 */}
      <div className="border-b border-warning/30 bg-warning/15 py-2 text-center text-xs font-semibold text-amber-300">
        ⚠ TEST MODE — Simulated cross-border payment preview. No real money or credit cards are charged.
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-14">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-5">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <HimpaarMark className="h-7 w-7" />
            <span className="font-display text-lg font-bold tracking-tight text-white">Himpaar</span>
            <span className="rounded-md bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300 uppercase">
              Secure Checkout
            </span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>256-bit Encrypted</span>
          </div>
        </div>

        {/* Loading / Error states */}
        {isLoading && <PageSkeleton label="Loading secure invoice checkout" rows={4} />}
        {isError && <ErrorState error={error} />}
        {!isLoading && !isError && !link && (
          <Card className="mx-auto max-w-lg py-12 text-center bg-slate-800 border-slate-700">
            <h2 className="font-display text-xl font-semibold text-white">Payment link not found</h2>
            <p className="mt-2 text-sm text-slate-400">This invoice link does not exist or has expired.</p>
            <div className="mt-6">
              <Link to="/" className="text-sm font-medium text-brand-400 hover:underline">
                Return to Himpaar Home
              </Link>
            </div>
          </Card>
        )}

        {/* Success / Result State */}
        {link && done && (
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-8 text-center shadow-2xl backdrop-blur-md">
              {outcome === "success" ? (
                <>
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle className="h-9 w-9" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Payment Succeeded!</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Simulated payment of{" "}
                    <span className="font-semibold text-white">
                      {formatMoney(link.amount.amount_minor, link.amount.currency)}
                    </span>{" "}
                    for <span className="font-medium text-slate-200">{link.merchant_name}</span> was completed.
                  </p>
                  <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Invoice Reference:</span>
                      <span className="font-mono font-medium text-white">{link.reference}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Recipient Exporter:</span>
                      <span className="font-medium text-white">{link.merchant_name}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Settlement Status:</span>
                      <span className="text-emerald-400 font-semibold">● Settled to NPR Holding</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Compliance Document:</span>
                      <span className="text-brand-300">Settlement Advice Generated (BS 2082)</span>
                    </div>
                  </div>
                </>
              ) : outcome === "decline" ? (
                <>
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                    <XCircle className="h-9 w-9" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Payment Declined (Simulated)</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    The simulated payment was rejected. No funds were transferred.
                  </p>
                </>
              ) : outcome === "pending" ? (
                <>
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                    <Clock className="h-9 w-9" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Payment Pending (Simulated)</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Simulated payment authorization submitted. Awaiting bank partner confirmation.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                    <XCircle className="h-9 w-9" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Simulation Error</h2>
                  <p className="mt-2 text-sm text-slate-300">An unexpected simulation failure occurred.</p>
                </>
              )}

              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setDone(false);
                    setOutcome(null);
                  }}
                  className="rounded-xl bg-slate-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  Test Another Simulation
                </button>
                <Link
                  to="/"
                  className="text-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Return to Himpaar
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Split Stripe/Razorpay Checkout Layout */}
        {link && !done && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Order Summary & Invoice Metadata */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 sm:p-7 backdrop-blur-md">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                  Export Invoice
                </span>
                <h1 className="mt-1 font-display text-2xl font-bold text-white">
                  {link.merchant_name}
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                  Export payment link generated via Himpaar Infrastructure
                </p>

                {/* Amount Due Big Display */}
                <div className="mt-6 border-y border-slate-800 py-5">
                  <div className="text-xs font-medium text-slate-400">Amount Due</div>
                  <div className="mt-1 font-display text-4xl font-extrabold tracking-tight text-white tabular-nums">
                    {formatMoney(link.amount.amount_minor, link.amount.currency)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs font-medium text-brand-300">
                      <Sparkles className="h-3 w-3" />
                      Direct Exporter Settlement
                    </span>
                  </div>
                </div>

                {/* Line Item Breakdown */}
                <div className="mt-5 space-y-3 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Invoice Reference:</span>
                    <span className="font-mono font-medium text-white">{link.reference}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Due Date:</span>
                    <span className="font-medium text-white">{formatDateOnly(link.due_date)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Recipient:</span>
                    <span className="font-medium text-white">{link.merchant_name}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-slate-400">Description:</span>
                    <p className="mt-1 text-slate-200 leading-relaxed">{link.description}</p>
                  </div>
                </div>

                {/* Trust Credentials */}
                <div className="mt-6 border-t border-slate-800 pt-5 space-y-2.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Nepal Rastra Bank compliant export remittance flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    <span>Automated Settlement Advice generated upon completion</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout / Paywall Methods Form */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 sm:p-8 shadow-2xl">
                {link.status !== "open" ? (
                  <div className="py-8 text-center">
                    <Badge tone={link.status === "paid" ? "success" : "danger"}>
                      {link.status === "paid" ? "Already Paid" : link.status === "expired" ? "Expired" : "Cancelled"}
                    </Badge>
                    <h3 className="mt-3 text-lg font-bold text-white">This payment link is no longer open</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Contact {link.merchant_name} if you require a refreshed export payment link.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Express Checkout Header (Apple Pay / Google Pay simulated) */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Express Checkout (Simulated)
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => fire("success")}
                          disabled={simulate.isPending}
                          className="flex h-11 items-center justify-center rounded-xl bg-white font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 active:scale-[0.98]"
                        >
                          <span className="text-sm font-bold"> Pay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fire("success")}
                          disabled={simulate.isPending}
                          className="flex h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-700 font-medium text-white shadow-sm transition-all hover:bg-slate-650 active:scale-[0.98]"
                        >
                          <span className="text-sm font-semibold">G Pay</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <div className="w-full border-t border-slate-700" />
                      <span className="absolute bg-slate-800 px-3 text-xs uppercase tracking-wider text-slate-400">
                        Or pay with foreign transfer method
                      </span>
                    </div>

                    {/* Payment Method Selector Tabs */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Select Payment Method
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {METHODS.map((m) => {
                          const Icon = m.icon;
                          const isSelected = method === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setMethod(m.id)}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                                isSelected
                                  ? "border-brand-500 bg-brand-500/10 shadow-sm ring-1 ring-brand-500 text-white"
                                  : "border-slate-700 bg-slate-850 hover:border-slate-600 text-slate-300"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  isSelected ? "text-brand-400" : "text-slate-400"
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold">{m.label}</div>
                                <div className="mt-0.5 text-[11px] text-slate-400 leading-tight">
                                  {m.sublabel}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Simulated Card Fields Preview */}
                    {method === "card" && (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400">Card Number</label>
                          <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white">
                            <span>•••• •••• •••• 4242</span>
                            <span className="text-[10px] text-emerald-400 font-sans font-medium">TEST CARD</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-slate-400">Expires</label>
                            <div className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white">
                              12 / 28
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-400">CVC</label>
                            <div className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white">
                              •••
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Wire / ACH Details */}
                    {method !== "card" && (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-xs text-slate-300 space-y-1.5">
                        <div className="font-semibold text-white">Simulated {METHOD_LABEL[method]} Pipeline:</div>
                        <p className="text-slate-400">
                          Funds routed through Himpaar partner bank escrow holding account and converted to NPR automatically upon receipt.
                        </p>
                      </div>
                    )}

                    {/* Primary & Secondary Action Simulation Buttons */}
                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => fire("success")}
                        disabled={simulate.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-500 hover:shadow-brand-500/40 active:scale-[0.98] disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          {simulate.isPending
                            ? "Simulating Payment..."
                            : `Simulate Pay ${formatMoney(link.amount.amount_minor, link.amount.currency)}`}
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fire("decline")}
                          disabled={simulate.isPending}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-650"
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-400" />
                          Simulate Decline
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fire("pending")}
                          disabled={simulate.isPending}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-650"
                        >
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          Simulate Pending
                        </Button>
                      </div>
                    </div>

                    <p className="text-center text-[11px] text-slate-400">
                      Sandbox demonstration. No real financial credentials or fiat funds are collected.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>
            Himpaar Sandbox Gateway • Automated NPR Exporter Settlement & Compliance Architecture • Kathmandu, Nepal
          </p>
        </div>
      </div>
    </div>
  );
}
