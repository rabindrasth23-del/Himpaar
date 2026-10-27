/**
 * Payer page — /pay/:token
 *
 * Public checkout page modelled after Stripe Checkout.
 * Split 2-column layout on desktop (summary left, form right).
 * Mobile: summary collapsible on top, form below.
 * AGENTS.md §9: TEST MODE banner visible on every state. No real card data collected.
 */
import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  CheckCircle,
  Clock,
  XCircle,
  Lock,
  CreditCard,
  Building,
  Globe2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePublicPaymentLink, useSimulatePayment } from "../api/hooks.ts";
import { Badge, ErrorState, PageSkeleton, cn } from "../components/ui.tsx";
import { formatMoney } from "../lib/money.ts";
import { formatDateOnly } from "../lib/dates.ts";
import { HimpaarMark } from "../components/brand.tsx";
import { METHOD_LABEL } from "../lib/labels.ts";
import type { PaymentMethod, PublicPaymentLink } from "@himpaar/shared";

/* ─── Payment method definitions ─── */
const METHODS: {
  id: PaymentMethod;
  label: string;
  sublabel: string;
  icon: typeof CreditCard;
}[] = [
  { id: "card", label: "Card", sublabel: "Visa, Mastercard, Amex (simulated)", icon: CreditCard },
  { id: "ach", label: "US Bank (ACH)", sublabel: "Direct debit (simulated)", icon: Building },
  { id: "sepa", label: "SEPA Transfer", sublabel: "Eurozone bank transfer (simulated)", icon: Globe2 },
  { id: "swift", label: "Wire (SWIFT)", sublabel: "International wire (simulated)", icon: FileText },
];

/* ─── Apple Pay button (SVG mark, white bg) ─── */
function ApplePayButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex h-12 items-center justify-center rounded-md bg-black text-white transition-all hover:bg-black/90 active:scale-[0.98] disabled:opacity-50"
    >
      <svg viewBox="0 0 165.52 46.46" className="h-5" fill="currentColor" aria-label="Apple Pay">
        <path d="M20.43 14.19a6.82 6.82 0 0 0 1.57-4.89 6.94 6.94 0 0 0-4.52 2.34 6.49 6.49 0 0 0-1.61 4.73 5.75 5.75 0 0 0 4.56-2.18zM21.98 16.58a7.2 7.2 0 0 0-3.38.95A6.78 6.78 0 0 0 16 16.58c-3.93.06-8 3.31-8 9.59 0 5.7 4.26 12.29 7.66 12.29a5 5 0 0 0 2.09-.57 4.59 4.59 0 0 1 1.83-.43 5.35 5.35 0 0 1 1.95.45 5.18 5.18 0 0 0 1.86.55c2.33-.04 5.1-4.38 6.41-8.06a6.38 6.38 0 0 1-3.8-5.81 6.32 6.32 0 0 1 3-5.34 6.64 6.64 0 0 0-5.04-2.67zM42.7 9.55h5.09c3.5 0 5.82 2.42 5.82 6 0 3.56-2.38 6-5.9 6H45.3v6.24H42.7zm2.6 2.18v7.63h3.19c2.47 0 3.4-1.29 3.4-3.82 0-2.5-.93-3.81-3.36-3.81zM55.67 23.34c0-2.84 1.71-4.35 4.65-4.35a6.03 6.03 0 0 1 3.13.79V21a4.93 4.93 0 0 0-2.65-.79c-1.59 0-2.5.77-2.5 2.63v.91c0 2.08.76 2.76 2.33 2.76a5.71 5.71 0 0 0 2.82-.83v1.3a5.73 5.73 0 0 1-3.3.91c-2.77 0-4.48-1.44-4.48-4.55zM65.5 27.79l4.69-8.63h2.58l-5.96 10.79a4.46 4.46 0 0 1-4.05 2.51h-.63v-1.44h.34a2.8 2.8 0 0 0 2.64-1.63l.49-.96-4.31-9.27h2.55z" />
      </svg>
      <span className="absolute right-2 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-black leading-none">
        Simulated
      </span>
    </button>
  );
}

/* ─── Google Pay button (SVG mark, white bg) ─── */
function GooglePayButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-900 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
    >
      <svg viewBox="0 0 62 24" className="h-5" aria-label="Google Pay">
        <g>
          <path fill="#4285F4" d="M29.57 11.94V17.5h-1.82V4.27h4.83a4.35 4.35 0 0 1 3.1 1.2 3.9 3.9 0 0 1 1.3 2.97 3.87 3.87 0 0 1-1.3 2.95 4.3 4.3 0 0 1-3.1 1.22h-3.01zm0-6.1v4.53h3.03a2.44 2.44 0 0 0 1.83-.73 2.42 2.42 0 0 0 .02-3.53l-.02-.02a2.48 2.48 0 0 0-1.83-.72h-3.03z" />
          <path fill="#34A853" d="M41.44 8.63c1.34 0 2.39.36 3.15 1.08.76.72 1.14 1.7 1.14 2.96v5.98h-1.74v-1.35h-.08c-.74 1.1-1.73 1.65-2.96 1.65a3.5 3.5 0 0 1-2.44-.88 2.84 2.84 0 0 1-.99-2.2c0-.93.35-1.67 1.06-2.22.7-.55 1.64-.83 2.82-.83.99 0 1.82.18 2.46.55v-.39c0-.62-.25-1.15-.74-1.57a2.43 2.43 0 0 0-1.67-.64c-.97 0-1.73.41-2.28 1.22l-1.6-.98c.82-1.23 2.03-1.38 3.87-1.38zm-2.15 7.55c0 .47.2.86.62 1.17.41.31.89.46 1.44.46.78 0 1.49-.3 2.1-.88a2.62 2.62 0 0 0 .93-1.96c-.53-.42-1.27-.63-2.2-.63-.68 0-1.25.17-1.71.5-.47.34-.7.77-.7 1.28l.02.06z" />
          <path fill="#4285F4" d="M52.68 8.92l-6.1 14.03H44.7l2.26-4.93L43.3 8.92h1.96l2.52 6.09h.04l2.46-6.09h2.4z" />
          <path fill="#EA4335" d="M18.72 10.79a7.8 7.8 0 0 0-.11-1.33h-7.55V12.1h4.33a3.7 3.7 0 0 1-1.6 2.43v2.02h2.59a7.8 7.8 0 0 0 2.34-5.76z" />
          <path fill="#FBBC04" d="M11.06 18.73c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01a4.68 4.68 0 0 1-2.71.76 4.73 4.73 0 0 1-4.44-3.27H3.93v2.08a8 8 0 0 0 7.13 4.38z" />
          <path fill="#34A853" d="M6.62 12.27a4.8 4.8 0 0 1 0-3.05V7.13H3.93a8.01 8.01 0 0 0 0 7.22l2.69-2.08z" />
          <path fill="#EA4335" d="M11.06 5.95a4.34 4.34 0 0 1 3.07 1.2l2.3-2.3A7.72 7.72 0 0 0 11.06 2.5a8 8 0 0 0-7.13 4.38l2.69 2.09a4.73 4.73 0 0 1 4.44-3.02z" />
        </g>
      </svg>
      <span className="absolute right-2 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-black leading-none">
        Simulated
      </span>
    </button>
  );
}

/* ─── Main payer page ─── */
export function PayerPage() {
  const { token } = useParams<{ token: string }>();
  const { data: link, isLoading, isError, error } = usePublicPaymentLink(token ?? "");
  const simulate = useSimulatePayment(token ?? "");

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [done, setDone] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

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

  /* ─── Result screen ─── */
  if (link && done) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <TestModeBanner />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            {outcome === "success" ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Payment succeeded</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Simulated payment of{" "}
                  <span className="font-medium text-slate-900">
                    {formatMoney(link.amount.amount_minor, link.amount.currency)}
                  </span>{" "}
                  for <span className="font-medium text-slate-700">{link.merchant_name}</span> was completed.
                </p>
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm space-y-2">
                  <Row label="Invoice" value={link.reference} mono />
                  <Row label="Recipient" value={link.merchant_name} />
                  <Row label="Settlement" value="Settled (simulated)" success />
                  <Row label="Document" value="Settlement advice (simulated)" />
                </div>
              </>
            ) : outcome === "decline" ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <XCircle className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Payment declined</h2>
                <p className="mt-2 text-sm text-slate-500">The simulated payment was rejected. No funds were transferred.</p>
              </>
            ) : outcome === "pending" ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Clock className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Payment pending</h2>
                <p className="mt-2 text-sm text-slate-500">Simulated payment submitted. Awaiting simulated confirmation.</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <XCircle className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Simulation error</h2>
                <p className="mt-2 text-sm text-slate-500">An unexpected simulation failure occurred.</p>
              </>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => { setDone(false); setOutcome(null); }}
                className="rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Test another simulation
              </button>
              <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
                Return to Himpaar
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Checkout layout ─── */
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TestModeBanner />

      {/* Loading / Error */}
      {isLoading && (
        <div className="mx-auto w-full max-w-2xl px-4 py-16">
          <PageSkeleton label="Loading checkout" rows={4} />
        </div>
      )}
      {isError && (
        <div className="mx-auto w-full max-w-2xl px-4 py-16">
          <ErrorState error={error} />
        </div>
      )}
      {!isLoading && !isError && !link && (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900">Payment link not found</h2>
            <p className="mt-1 text-sm text-slate-500">This invoice link does not exist or has expired.</p>
            <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
              Return to Himpaar
            </Link>
          </div>
        </div>
      )}

      {/* Main 2-column checkout */}
      {link && !done && (
        <div className="flex flex-1">
          {/* ── Left panel: Order summary (brand tinted bg) ── */}
          {/* Desktop: always visible. Mobile: collapsible accordion at top */}

          {/* Mobile summary accordion */}
          <div className="border-b border-slate-200 bg-slate-50 lg:hidden">
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 text-brand-600 font-medium">
                {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {summaryOpen ? "Hide" : "Show"} order summary
              </span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatMoney(link.amount.amount_minor, link.amount.currency)}
              </span>
            </button>
            {summaryOpen && (
              <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                <OrderSummary link={link} />
              </div>
            )}
          </div>

          {/* Desktop 2-column */}
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col lg:flex-row">
            {/* Left: summary panel */}
            <div className="hidden lg:flex lg:w-[440px] lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-slate-50 lg:px-10 lg:py-12">
              <div className="flex items-center gap-2.5">
                <HimpaarMark className="h-6 w-6" />
                <span className="font-display text-[15px] font-bold text-slate-900 tracking-tight">Himpaar</span>
              </div>
              <div className="mt-8">
                <OrderSummary link={link} />
              </div>
              <div className="mt-auto pt-8 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Sandbox checkout — no real money
                </div>
                <div className="flex gap-3">
                  <Link to="/terms" className="hover:underline">Terms</Link>
                  <Link to="/privacy" className="hover:underline">Privacy</Link>
                </div>
              </div>
            </div>

            {/* Right: payment form panel */}
            <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
              <div className="mx-auto w-full max-w-[440px]">

                {link.status !== "open" ? (
                  <div className="py-12 text-center">
                    <Badge tone={link.status === "paid" ? "success" : "danger"}>
                      {link.status === "paid" ? "Already Paid" : link.status === "expired" ? "Expired" : "Cancelled"}
                    </Badge>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">This payment link is no longer open</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Contact {link.merchant_name} if you need a new link.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pay with heading */}
                    <h2 className="text-base font-semibold text-slate-900">Pay with</h2>

                    {/* Express checkout: Apple Pay + Google Pay */}
                    <div className="grid grid-cols-2 gap-3">
                      <ApplePayButton onClick={() => fire("success")} disabled={simulate.isPending} />
                      <GooglePayButton onClick={() => fire("success")} disabled={simulate.isPending} />
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center">
                      <div className="flex-1 border-t border-slate-200" />
                      <span className="px-3 text-xs text-slate-400">Or pay with</span>
                      <div className="flex-1 border-t border-slate-200" />
                    </div>

                    {/* Payment method tabs */}
                    <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                      {METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          className={cn(
                            "flex-1 rounded-md px-2 py-2 text-center text-xs font-medium transition-colors",
                            method === m.id
                              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Card fields (simulated) */}
                    {method === "card" && (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-700">Card number</label>
                          <div className="flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm">
                            <span className="font-mono text-slate-900 tracking-wider">4242 4242 4242 4242</span>
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              TEST
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">Expiry</label>
                            <div className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900">
                              12 / 28
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">CVC</label>
                            <div className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900">
                              •••
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Test card — no real card data is collected.
                        </p>
                      </div>
                    )}

                    {/* Bank wire / ACH / SEPA / SWIFT info */}
                    {method !== "card" && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
                        <div className="font-medium text-slate-900">Simulated {METHOD_LABEL[method]}</div>
                        <p className="text-xs text-slate-500">
                          No funds move. The sandbox records a simulated NPR settlement.
                        </p>
                      </div>
                    )}

                    {/* Primary simulation button */}
                    <button
                      onClick={() => fire("success")}
                      disabled={simulate.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-50"
                    >
                      {simulate.isPending
                        ? "Simulating…"
                        : `Pay ${formatMoney(link.amount.amount_minor, link.amount.currency)}`}
                    </button>

                    {/* Secondary simulation buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => fire("decline")}
                        disabled={simulate.isPending}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                        Simulate decline
                      </button>
                      <button
                        onClick={() => fire("pending")}
                        disabled={simulate.isPending}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Simulate pending
                      </button>
                    </div>

                    <p className="text-center text-[11px] text-slate-400">
                      Sandbox. No real credentials or funds are collected.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 py-4 text-center text-[11px] text-slate-400">
        Himpaar Sandbox · Simulated checkout · Kathmandu, Nepal
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function TestModeBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 py-2 text-center text-xs font-medium text-amber-800">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
      TEST MODE — No real money is charged
    </div>
  );
}

function OrderSummary({ link }: { link: PublicPaymentLink }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-900">{link.merchant_name}</p>
        <p className="mt-0.5 text-xs text-slate-500">Export payment</p>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Amount</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatMoney(link.amount.amount_minor, link.amount.currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Invoice</span>
          <span className="font-mono text-xs text-slate-700">{link.reference}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Due</span>
          <span className="text-slate-700">{formatDateOnly(link.due_date)}</span>
        </div>
        <div className="border-t border-slate-200 pt-3">
          <span className="text-slate-500">Description</span>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{link.description}</p>
        </div>
        <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold">
          <span className="text-slate-900">Total due</span>
          <span className="text-slate-900 tabular-nums">
            {formatMoney(link.amount.amount_minor, link.amount.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, success }: { label: string; value: string; mono?: boolean; success?: boolean }) {
  return (
    <div className="flex justify-between text-slate-500">
      <span>{label}</span>
      <span
        className={cn(
          "text-right",
          mono && "font-mono text-xs",
          success ? "font-medium text-emerald-600" : "text-slate-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}
