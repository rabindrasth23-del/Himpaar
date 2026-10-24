import { Link } from "react-router";
import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import createGlobe from "cobe";
import {
  ArrowRight,
  Check,
  Copy,
  Sparkles,
  ShieldCheck,
  Terminal,
  FileText,
  CheckCircle2,
  ChevronDown,
  Play,
  ChevronRight,
  Calculator,
  Building2,
  UserCheck,
  Coins,
  Star,
  BadgeCheck,
} from "lucide-react";
import { HimpaarMark } from "../components/brand.tsx";
import { cn } from "../components/ui.tsx";

/* ────────────────────────────────────────────────────────────
   Himpaar Landing Page — Wise-Inspired High-Impact Fintech
   Clean white aesthetic, bold editorial Grotesque typography,
   energetic Wise lime (#9FE870) accents, transparent fee calculator.
   Aim: International payment gateway for Nepali freelancers & IT exporters.
   AGENTS.md §9 compliant: honest sandbox labeling, zero false claims.
   ──────────────────────────────────────────────────────────── */

// ── Smooth Scroll Reveal Wrapper ────────────────────────────
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Interactive 3D Cobe Globe (Clean Light/Fintech Style) ────
function InteractiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let width = canvas.offsetWidth || 500;

    const onResize = () => {
      if (canvasRef.current && canvasRef.current.offsetWidth > 0) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);

    let globe: { update: (opts: { phi?: number; width?: number; height?: number }) => void; destroy: () => void } | null = null;
    let animId = 0;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0.45,
        theta: 0.28,
        dark: 0, // Clean light mode
        diffuse: 1.4,
        mapSamples: 16000,
        mapBrightness: 6,
        mapBaseBrightness: 0.85,
        baseColor: [0.94, 0.96, 0.98],
        markerColor: [0.15, 0.45, 0.95],
        glowColor: [0.88, 0.92, 0.98],
        markers: [
          // Kathmandu, Nepal (Hub)
          { location: [27.7172, 85.324], size: 0.13 },
          // Key export client hubs
          { location: [40.7128, -74.006], size: 0.06 }, // New York
          { location: [37.7749, -122.4194], size: 0.05 }, // San Francisco
          { location: [51.5074, -0.1278], size: 0.06 }, // London
          { location: [1.3521, 103.8198], size: 0.06 }, // Singapore
          { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
          { location: [25.2048, 55.2708], size: 0.06 }, // Dubai
          { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
          { location: [52.52, 13.405], size: 0.05 }, // Berlin
        ],
        arcs: [
          { from: [40.7128, -74.006], to: [27.7172, 85.324] },
          { from: [37.7749, -122.4194], to: [27.7172, 85.324] },
          { from: [51.5074, -0.1278], to: [27.7172, 85.324] },
          { from: [1.3521, 103.8198], to: [27.7172, 85.324] },
          { from: [35.6762, 139.6503], to: [27.7172, 85.324] },
          { from: [25.2048, 55.2708], to: [27.7172, 85.324] },
          { from: [-33.8688, 151.2093], to: [27.7172, 85.324] },
          { from: [52.52, 13.405], to: [27.7172, 85.324] },
        ],
        arcColor: [0.2, 0.45, 0.95],
        arcWidth: 1.5,
        arcHeight: 0.38,
      });

      const loop = () => {
        phi += 0.0035;
        if (globe) {
          globe.update({ phi });
        }
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    } catch {
      setWebGlSupported(false);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (globe) globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!webGlSupported) {
    return (
      <div className="relative flex aspect-square w-full max-w-[480px] items-center justify-center">
        <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
          <circle cx="200" cy="200" r="160" fill="#f0f4f8" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="270" cy="175" r="8" fill="#2563EB" />
          <circle cx="270" cy="175" r="16" fill="#2563EB" opacity="0.2" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative flex aspect-square w-full max-w-[480px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-blue-50/50 blur-2xl" />
      <canvas
        ref={canvasRef}
        className="h-full w-full contain-strict"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Kathmandu Nexus Tag */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-1.5 shadow-sm backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
        </span>
        <span className="text-xs font-bold text-slate-900">
          Kathmandu Hub <span className="font-normal text-slate-500">• 27.71° N, 85.32° E</span>
        </span>
      </div>
    </div>
  );
}

// ── Wise-Inspired Live Transparent Rate & Fee Calculator ─────
function WiseRateCalculator() {
  const [amountStr, setAmountStr] = useState<string>("2500");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");

  const rates = {
    USD: 134.85,
    EUR: 146.40,
    GBP: 173.20,
  };

  const amount = Math.max(0, parseFloat(amountStr) || 0);
  const rate = rates[currency];
  const feePercent = 0.01; // 1.0% transparent fee
  const fee = amount * feePercent;
  const netForeign = Math.max(0, amount - fee);
  const netNpr = netForeign * rate;

  // Traditional bank wire comparison (Swift fee ~$45 + intermediary ~$20 + 2.5% hidden spread)
  const legacyFxRate = rate * 0.975;
  const legacyNetNpr = Math.max(0, (amount - 65) * legacyFxRate);
  const savingsNpr = Math.max(0, netNpr - legacyNetNpr);

  return (
    <div className="w-full max-w-xl rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Calculator className="h-3.5 w-3.5 text-slate-700" />
            Transparent Fee Engine
          </span>
          <h3 className="mt-1 font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            Live Settlement Estimator
          </h3>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          Zero Hidden Spread
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Input 1: Client Pays */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            Foreign Client Pays
          </label>
          <div className="flex items-center rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-2 focus-within:border-slate-900 focus-within:bg-white transition-all">
            <span className="px-3 text-2xl font-bold text-slate-400">
              {currency === "USD" ? "$" : currency === "EUR" ? "€" : "£"}
            </span>
            <input
              type="number"
              min="50"
              step="50"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-slate-900 focus:outline-none tabular-nums"
              placeholder="2500"
            />
            <div className="shrink-0 border-l border-slate-200 pl-2 pr-1">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "GBP")}
                className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-xs focus:outline-none cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preset chips */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-400">Presets:</span>
          {["500", "1500", "2500", "5000", "10000"].map((preset) => (
            <button
              key={preset}
              onClick={() => setAmountStr(preset)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition-all",
                amountStr === preset
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              ${Number(preset).toLocaleString()}
            </button>
          ))}
        </div>

        {/* Connected Fee Pipeline (Wise Style) */}
        <div className="relative my-4 ml-6 space-y-3.5 border-l-2 border-dashed border-slate-300 pl-6 text-xs text-slate-600">
          <div className="relative">
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700">1.0% Transparent Himpaar Fee</span>
              <span className="font-mono font-bold text-slate-900">
                -{currency} {fee.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700">Total amount we convert</span>
              <span className="font-mono font-bold text-slate-900">
                {currency} {netForeign.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#9FE870]" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Guaranteed Mid-Market Exchange Rate</span>
              <span className="font-mono font-extrabold text-blue-600">
                1 {currency} = {rate.toFixed(2)} NPR
              </span>
            </div>
          </div>
        </div>

        {/* Input 2: Recipient Gets in Nepal */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            Recipient Gets in Nepal (NPR)
          </label>
          <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-800">रू</span>
              <span className="font-display text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {netNpr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-slate-800 shadow-xs border border-slate-200">
              🇳🇵 NPR
            </div>
          </div>
        </div>

        {/* Payout Bank Support Note */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
          <span className="font-medium">Direct Settlement into:</span>
          <span className="font-semibold text-slate-800">
            Nabil • NIC Asia • Global IME • eSewa • Khalti
          </span>
        </div>

        {/* Savings Alert Banner */}
        {savingsNpr > 0 && (
          <div className="rounded-2xl bg-[#9FE870]/20 border border-[#9FE870] p-4 text-xs">
            <div className="flex items-center justify-between font-bold text-[#163300]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                Estimated Exporter Savings:
              </span>
              <span className="text-sm font-black font-mono">
                +रू {savingsNpr.toLocaleString("en-US", { maximumFractionDigits: 0 })} NPR
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Versus traditional correspondent bank wires charging ~$65 in fixed fees + 2.5% hidden FX markup.
            </p>
          </div>
        )}

        {/* CTA Button */}
        <div className="pt-2">
          <Link
            to="/signup"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#9FE870] hover:bg-[#8ee05b] py-4 text-base font-extrabold text-[#163300] shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <span>Create Free Sandbox Account</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Simulated sandbox environment • Zero real funds moved • 100% compliant export docs
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Interactive Pipeline Demo Widget (Clean Light/Fintech Style) ──
function HeroPipelineInteractive() {
  const [activeStep, setActiveStep] = useState<"payer" | "settlement" | "advice">("settlement");

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-200/50">
        {/* Top Header / View Selector */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 font-mono text-xs text-slate-500 font-medium">himpaar.flow.sandbox</span>
          </div>

          <div className="flex items-center rounded-xl bg-slate-200/70 p-1 text-xs">
            <button
              onClick={() => setActiveStep("payer")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-bold transition-all",
                activeStep === "payer" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              1. Payer Link
            </button>
            <button
              onClick={() => setActiveStep("settlement")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-bold transition-all",
                activeStep === "settlement" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              2. NPR Ledger
            </button>
            <button
              onClick={() => setActiveStep("advice")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-bold transition-all",
                activeStep === "advice" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              3. Advice Doc
            </button>
          </div>
        </div>

        {/* Content based on Active Step */}
        <div className="p-6">
          {activeStep === "payer" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Client Checkout (Simulated)
                  </span>
                  <h4 className="mt-0.5 text-lg font-bold text-slate-900">Acme Global Inc.</h4>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">
                  INV-2025-1042
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs text-slate-500">Amount requested in USD</div>
                <div className="mt-1 font-display text-3xl font-black text-slate-900">$2,400.00 <span className="text-sm font-semibold text-slate-500">USD</span></div>
                <div className="mt-1 text-xs text-slate-600">
                  For: Web Platform Engineering Milestone 2 • Everest Pixel Labs Pvt. Ltd.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Simulated Card</span>
                  <span className="font-mono">•••• •••• •••• 4242</span>
                </div>
                <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-sm">
                  <Check className="h-4 w-4 text-[#9FE870]" />
                  Simulated Paid ($2,400.00)
                </div>
                <p className="text-center text-[11px] text-slate-400">
                  No real cards or money are processed. Sandbox preview only.
                </p>
              </div>
            </div>
          )}

          {activeStep === "settlement" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    NPR Bank Settlement
                  </span>
                  <h4 className="mt-0.5 text-lg font-bold text-slate-900">Everest Pixel Labs Pvt. Ltd.</h4>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Settled
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="text-xs text-emerald-800 font-semibold">Net Credited in NPR (1 USD = 134.85 NPR)</div>
                <div className="mt-1 font-display text-3xl font-black text-slate-900 tabular-nums">
                  रू 320,403.60
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Direct payout to Nabil Bank Ltd • A/C ••••8912
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Gross USD inflow:</span>
                  <span className="font-mono font-bold text-slate-900">$2,400.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Himpaar Platform Fee (1.0%):</span>
                  <span className="font-mono text-slate-600">-$24.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Settlement status:</span>
                  <span className="font-bold text-emerald-600">Instant Automated Credit</span>
                </div>
              </div>
            </div>
          )}

          {activeStep === "advice" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    Official Tax Proof Document
                  </span>
                  <h4 className="mt-0.5 text-base font-bold text-slate-900">Settlement Advice</h4>
                </div>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-mono font-bold text-purple-800">
                  HP-2026-001042
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Bikram Sambat:</span>
                  <span className="font-bold text-slate-900">2083 Kartik 08 BS</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Gregorian AD:</span>
                  <span className="font-bold text-slate-900">2026 Oct 24 AD</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Merchant PAN:</span>
                  <span className="font-mono font-bold text-slate-900">601928374</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>IRD 5% Withholding Track:</span>
                  <span className="font-bold text-emerald-600">Compliant Export Invoice</span>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 p-2.5 text-center text-xs font-bold text-slate-700">
                📄 Stamped and signed audit receipt ready for IRD tax filing
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Verified Sandbox Pipeline
          </span>
          <span className="text-slate-400">Zero real financial risk</span>
        </div>
      </div>
    </div>
  );
}

// ── Developer Studio / Code Playground (High Contrast) ──────
const snippetSdk = `import { Himpaar } from "@himpaar/sdk";

// Initialize with your sandbox API key
const hp = new Himpaar({
  apiKey: "hp_test_sec_9f82d1...",
});

// Create an export payment link
const link = await hp.paymentLinks.create({
  amount: 250000,          // $2,500.00 in minor units (cents)
  currency: "USD",
  description: "Quarterly Software Engineering Milestone",
  clientName: "Acme Global Corp",
  clientEmail: "billing@acme.example",
  expiresIn: "14d",
});

console.log("Shareable Link:", link.url);
// → https://pay.himpaar.com/pl_98a72b14`;

const snippetWebhook = `import express from "express";
import { verifyWebhook } from "@himpaar/sdk";

const app = express();

app.post("/api/webhooks/himpaar", express.raw({ type: "application/json" }), (req, res) => {
  // Verify HMAC-SHA256 signature
  const event = verifyWebhook(
    req.body,
    req.headers["x-himpaar-signature"],
    process.env.HIMPAAR_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case "payment.succeeded":
      console.log("USD Paid:", event.data.amount);
      console.log("Settled NPR:", event.data.settlement.netNpr);
      break;
    case "settlement.created":
      console.log("Bikram Sambat Advice Ref:", event.data.document.reference);
      break;
  }

  res.status(200).json({ received: true });
});`;

const snippetCurl = `curl -X POST https://api.himpaar.com/v1/payment-links \\
  -H "Authorization: Bearer hp_test_sec_9f82d1..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 250000,
    "currency": "USD",
    "description": "Invoice #1042 - Software Services Export",
    "client_name": "Acme Global Corp",
    "client_email": "billing@acme.example",
    "due_date": "2026-11-20"
  }'`;

function DeveloperStudio() {
  const [activeTab, setActiveTab] = useState<"sdk" | "webhook" | "curl">("sdk");
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);

  const code = useMemo(() => {
    if (activeTab === "sdk") return snippetSdk;
    if (activeTab === "webhook") return snippetWebhook;
    return snippetCurl;
  }, [activeTab]);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function runSimulation() {
    setSimulating(true);
    setSimulatedResponse(null);
    setTimeout(() => {
      setSimulating(false);
      setSimulatedResponse(
        JSON.stringify(
          {
            id: "pl_sandbox_98a72b",
            status: "active",
            url: "https://pay.himpaar.com/pl_sandbox_98a72b",
            amount: { amount_minor: "250000", currency: "USD" },
            estimated_npr: { amount_minor: "33375375", currency: "NPR" },
            rate_applied: "134.850000",
            settlement_document: "BS-2083-001042",
            created_at: new Date().toISOString(),
          },
          null,
          2
        )
      );
    }, 700);
  }

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-[#0e131f] shadow-2xl">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-white/[0.03] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#9FE870]" />
          <span className="font-mono text-xs font-bold text-white/90">Himpaar Developer Platform</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveTab("sdk");
              setSimulatedResponse(null);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "sdk" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
            )}
          >
            TypeScript SDK
          </button>
          <button
            onClick={() => {
              setActiveTab("webhook");
              setSimulatedResponse(null);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "webhook" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
            )}
          >
            Webhooks
          </button>
          <button
            onClick={() => {
              setActiveTab("curl");
              setSimulatedResponse(null);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "curl" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
            )}
          >
            cURL
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {activeTab === "sdk" && (
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="flex items-center gap-1.5 rounded-full bg-[#9FE870] px-3.5 py-1.5 text-xs font-extrabold text-[#163300] hover:bg-[#8ee05b] transition-all"
            >
              <Play className={cn("h-3 w-3", simulating && "animate-spin")} />
              {simulating ? "Executing..." : "Test Sandbox"}
            </button>
          )}
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-slate-300">
          <code>{code}</code>
        </pre>

        {simulatedResponse && (
          <div className="border-t border-slate-800 bg-black/60 p-4">
            <div className="flex items-center justify-between pb-2 text-[11px] font-mono text-[#9FE870]">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-[#9FE870]" />
                HTTP 200 OK — Sandbox Execution (112ms)
              </span>
              <button
                onClick={() => setSimulatedResponse(null)}
                className="text-white/40 hover:text-white text-xs"
              >
                Clear
              </button>
            </div>
            <pre className="overflow-x-auto font-mono text-[11px] text-[#9FE870]/90">
              <code>{simulatedResponse}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-white/[0.02] px-6 py-3 text-xs text-white/50">
        <span>Package: @himpaar/sdk • TypeScript 5.0+ • Node.js, Bun, Edge</span>
        <Link to="/signup" className="text-[#9FE870] hover:underline font-semibold flex items-center gap-1">
          Get Sandbox API Keys
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Interactive Settlement Advice Showcase (Dual BS/AD) ──────
function SettlementAdviceShowcase() {
  const [activeDoc, setActiveDoc] = useState<"tech" | "handicraft" | "consulting">("tech");

  const docs = {
    tech: {
      ref: "HP-2026-001042",
      bs: "2083-07-08 BS",
      ad: "2026-10-24 AD",
      merchant: "Everest Pixel Labs Pvt. Ltd.",
      pan: "601928374",
      desc: "Custom Enterprise Cloud Software Milestone 2",
      client: "Acme Global Corp (Delaware, USA)",
      grossUsd: "$2,400.00",
      feeUsd: "$24.00",
      rate: "1 USD = 134.85 NPR",
      netNpr: "NPR 320,403.60",
    },
    handicraft: {
      ref: "HP-2026-000988",
      bs: "2083-06-25 BS",
      ad: "2026-10-11 AD",
      merchant: "Himalayan Pashmina Weavers Co.",
      pan: "609812456",
      desc: "Export consignment of 150 Cashmere Shawls",
      client: "Kashmiri Luxe Ltd (London, UK)",
      grossUsd: "$5,850.00",
      feeUsd: "$58.50",
      rate: "1 USD = 134.85 NPR",
      netNpr: "NPR 780,983.78",
    },
    consulting: {
      ref: "HP-2026-000854",
      bs: "2083-06-12 BS",
      ad: "2026-09-28 AD",
      merchant: "Kathmandu Creative Advisory",
      pan: "603456789",
      desc: "UI/UX & Architectural Design Retainer Q3",
      client: "Nordic Venture Studio (Stockholm)",
      grossUsd: "$3,200.00",
      feeUsd: "$32.00",
      rate: "1 USD = 134.85 NPR",
      netNpr: "NPR 427,204.80",
    },
  };

  const current = docs[activeDoc];

  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
      {/* Left Details */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <FileText className="h-3.5 w-3.5" />
            Audit-Ready Exporter Documents
          </span>
          <h2
            className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dual-calendar settlement advice for tax and audit
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every cross-border settlement automatically generates a verifiable Himpaar Settlement Advice.
            Timestamped in both Bikram Sambat (BS) and Gregorian (AD) calendars, complete with exchange rates,
            PAN, and foreign remitter details accepted by Nepali auditors and chartered accountants.
          </p>
        </div>

        {/* Exporter Sample Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Exporter Profile:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveDoc("tech")}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition-all",
                activeDoc === "tech"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              💻 Tech & IT Exporters
            </button>
            <button
              onClick={() => setActiveDoc("handicraft")}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition-all",
                activeDoc === "handicraft"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              🧣 Handicraft & Goods
            </button>
            <button
              onClick={() => setActiveDoc("consulting")}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition-all",
                activeDoc === "consulting"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              🎨 Creative Freelancers
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[
            "Bikram Sambat (BS 2083) and Gregorian (AD 2026) dual timestamping",
            "Transparent exchange rate & foreign currency audit trail",
            "Designed for Inland Revenue Department (IRD) 5% export withholding clearance",
            "Downloadable in PDF and JSON formats directly from merchant dashboard",
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Realistic Document Card */}
      <div className="lg:col-span-7">
        <div className="relative mx-auto max-w-md rounded-3xl border border-slate-300 bg-white p-7 shadow-2xl">
          {/* Document watermark / header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <HimpaarMark className="h-8 w-8" />
              <div>
                <h4 className="font-display text-base font-bold text-slate-900">Himpaar Settlement Advice</h4>
                <p className="text-[11px] font-bold text-rose-600">
                  SIMULATED SANDBOX PREVIEW • NOT AN OFFICIAL BANK NOTICE
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-slate-900">{current.ref}</span>
              <div className="mt-0.5 text-[10px] text-slate-400">Nepal Export Format</div>
            </div>
          </div>

          {/* Dual Date & Entity Info */}
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-xs">
            <div>
              <span className="text-slate-400">Date (Bikram Sambat):</span>
              <div className="font-bold text-slate-900">{current.bs}</div>
            </div>
            <div>
              <span className="text-slate-400">Date (Gregorian AD):</span>
              <div className="font-bold text-slate-900">{current.ad}</div>
            </div>
            <div>
              <span className="text-slate-400">Beneficiary Merchant:</span>
              <div className="font-bold text-slate-900 truncate">{current.merchant}</div>
              <div className="text-[10px] text-slate-500 font-mono">PAN: {current.pan}</div>
            </div>
            <div>
              <span className="text-slate-400">Foreign Client:</span>
              <div className="font-bold text-slate-900 truncate">{current.client}</div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 border-b border-slate-100 pb-3 text-xs">
            <span className="text-slate-400">Service / Export Classification:</span>
            <div className="font-semibold text-slate-900">{current.desc}</div>
          </div>

          {/* Ledger Table */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Foreign Inflow</span>
              <span className="font-mono font-bold text-slate-900">{current.grossUsd}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Himpaar Platform Fee (1.00%)</span>
              <span className="font-mono text-slate-700">-{current.feeUsd}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Verified Rate Benchmark</span>
              <span className="font-mono text-slate-700">{current.rate}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
              <span className="font-black text-slate-900">Total Net NPR Deposited</span>
              <span className="font-display text-xl font-black text-emerald-600 tabular-nums">
                {current.netNpr}
              </span>
            </div>
          </div>

          {/* Verification stamp */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] text-emerald-800">
            <span className="flex items-center gap-1.5 font-bold">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Cryptographically Verified Sandbox Ledger
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-700">Status: Settled</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Competitive Comparison Matrix (SWIFT vs Third-Party vs Himpaar) ─
function CompetitiveMatrix() {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-white">
            <tr>
              <th className="py-5 px-6">Feature / Capability</th>
              <th className="py-5 px-6 bg-[#9FE870] text-[#163300] font-black text-sm">Himpaar Rail</th>
              <th className="py-5 px-6 text-slate-300">Traditional Bank SWIFT</th>
              <th className="py-5 px-6 text-slate-300">Third-Party Wallets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50/70 transition-colors">
              <td className="py-4 px-6 font-bold text-slate-900">Foreign Client Payment Link</td>
              <td className="py-4 px-6 font-bold text-slate-900 bg-emerald-50/40">
                ✓ Instant 1-click shareable link
              </td>
              <td className="py-4 px-6 text-slate-500">Manual SWIFT wire instructions</td>
              <td className="py-4 px-6 text-slate-500">Requires client registration</td>
            </tr>
            <tr className="hover:bg-slate-50/70 transition-colors">
              <td className="py-4 px-6 font-bold text-slate-900">Fee Transparency</td>
              <td className="py-4 px-6 font-extrabold text-emerald-700 bg-emerald-50/40">
                1.0% Flat & Transparent
              </td>
              <td className="py-4 px-6 text-rose-600 font-semibold">$35–$65 wire fee + 2.5% FX markup</td>
              <td className="py-4 px-6 text-rose-600 font-semibold">2% conversion + up to 4% card fee</td>
            </tr>
            <tr className="hover:bg-slate-50/70 transition-colors">
              <td className="py-4 px-6 font-bold text-slate-900">Settlement Speed</td>
              <td className="py-4 px-6 font-bold text-slate-900 bg-emerald-50/40">
                Same-Day Direct Bank Credit
              </td>
              <td className="py-4 px-6 text-slate-500">4 to 7 business days</td>
              <td className="py-4 px-6 text-slate-500">2 to 4 business days</td>
            </tr>
            <tr className="hover:bg-slate-50/70 transition-colors">
              <td className="py-4 px-6 font-bold text-slate-900">Bikram Sambat (BS) Tax Proof</td>
              <td className="py-4 px-6 font-extrabold text-emerald-700 bg-emerald-50/40">
                ✓ Auto Dual BS 2083 + AD Advice Doc
              </td>
              <td className="py-4 px-6 text-rose-600 font-semibold">Manual bank visits & FIRC paperwork</td>
              <td className="py-4 px-6 text-slate-400">Foreign statement without BS dates</td>
            </tr>
            <tr className="hover:bg-slate-50/70 transition-colors">
              <td className="py-4 px-6 font-bold text-slate-900">Developer SDK & Webhooks</td>
              <td className="py-4 px-6 font-bold text-slate-900 bg-emerald-50/40">
                ✓ TypeScript SDK & Signed Webhooks
              </td>
              <td className="py-4 px-6 text-slate-400">None (100% offline manual)</td>
              <td className="py-4 px-6 text-slate-400">Complex proprietary enterprise API</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── FAQ Accordion Section ────────────────────────────────────
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is Himpaar and who is it built for?",
      a: "Himpaar is an international payment gateway specifically engineered for Nepali IT software companies, agencies, remote freelancers, and export businesses. We allow you to generate shareable foreign-currency payment links in USD, EUR, and GBP. When your foreign clients pay, funds are converted at mid-market rates and settled directly in NPR into your local Nepali commercial bank account, accompanied by an automated, audit-ready Settlement Advice document.",
    },
    {
      q: "How does Himpaar solve the current banking hurdles for Nepali exporters?",
      a: "Nepali exporters currently lose up to 5% to 7% of their hard-earned income to intermediary SWIFT correspondent fees, high conversion spreads, and foreign wallet withdrawal charges. Furthermore, proving foreign export income to Nepali tax authorities (IRD) requires painful manual bank visits. Himpaar replaces this with a 1.0% transparent fee, guaranteed mid-market FX rates, and instant Bikram Sambat settlement advice documents.",
    },
    {
      q: "What is this sandbox preview?",
      a: "This sandbox preview is a complete interactive testing environment for exporters and developers. You can generate payment links, simulate foreign client card and ACH checkouts, review double-entry NPR merchant ledgers, test webhook integrations with our TypeScript SDK, and inspect generated export advice documents. No real money or bank accounts are touched.",
    },
    {
      q: "Why are Bikram Sambat (BS) dates essential on export settlement advice?",
      a: "Nepal's Inland Revenue Department (IRD), corporate tax laws, and Nepal Rastra Bank follow the Bikram Sambat calendar (e.g. FY 2083/84). Himpaar natively stamps all settlement records with both Bikram Sambat (BS) and Gregorian (AD) dates, making tax filing and claiming the 5% final withholding tax deduction completely seamless.",
    },
    {
      q: "Which Nepali banks are supported for NPR payout?",
      a: "In our banking architecture model, NPR settlements can be routed directly to any licensed Class 'A' commercial bank in Nepal (including Nabil Bank, NIC Asia Bank, Global IME Bank, Himalayan Bank, Sanima Bank, etc.) as well as licensed digital wallets like eSewa and Khalti.",
    },
    {
      q: "Can developers integrate Himpaar via API into their SaaS or agency platform?",
      a: "Yes. Himpaar provides the @himpaar/sdk library for TypeScript and Node.js, standard REST endpoints, and HMAC-SHA256 cryptographically signed webhooks. You can dynamically create links and automate ERP reconciliation in under an afternoon.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {faqs.map((faq, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-xs"
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-slate-50"
            >
              <span className="font-display text-base font-bold text-slate-900">{faq.q}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200",
                  isOpen && "rotate-180 text-slate-900"
                )}
              />
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 p-6 pt-3 text-sm leading-relaxed text-slate-600">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main High-Impact Landing Page (Wise Design Aesthetic) ────
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900 antialiased selection:bg-[#9FE870] selection:text-[#163300]">
      {/* ── Top Subtle Notice ──────────────────────────────── */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs text-slate-600">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            SANDBOX PREVIEW
          </span>
          <span className="hidden sm:inline text-slate-600">
            Simulating cross-border payments & NPR settlements for Nepali IT exporters. Zero real money moves.
          </span>
          <Link to="/signup" className="font-bold text-slate-900 underline hover:text-emerald-700 ml-1">
            Try Live Demo →
          </Link>
        </div>
      </div>

      {/* ── Sticky Pure-White Header (Wise Style) ──────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="Himpaar Home">
            <HimpaarMark className="h-8 w-8 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-display text-2xl font-black tracking-tight text-slate-900">
                Himpaar
              </span>
              <span className="text-[10px] -mt-1 font-bold tracking-widest uppercase text-emerald-700">
                Export Gateway
              </span>
            </div>
          </Link>

          {/* Navigation Items (Wise Style: Personal / Business / Platform) */}
          <div className="hidden items-center gap-8 md:flex text-sm font-bold text-slate-700">
            <a href="#who-we-serve" className="hover:text-slate-900 transition-colors">
              For IT Exporters
            </a>
            <a href="#calculator" className="hover:text-slate-900 transition-colors">
              Rate Calculator
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#advice-doc" className="hover:text-slate-900 transition-colors">
              Settlement Advice
            </a>
            <a href="#developers" className="hover:text-slate-900 transition-colors">
              Developers
            </a>
          </div>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              <span>🇳🇵 NPR / USD</span>
            </div>

            <Link
              to="/login"
              className="text-sm font-bold text-slate-800 hover:text-slate-900 px-3 py-2 transition-colors"
            >
              Log in
            </Link>

            {/* Signature Wise Lime Pill CTA Button */}
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#9FE870] hover:bg-[#8ee05b] px-6 py-2.5 text-sm font-extrabold text-[#163300] shadow-xs hover:shadow transition-all active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION (Wise-Inspired Massive Bold Grotesque Typography) ── */}
      <section className="relative overflow-hidden bg-white pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {/* Centered Trust Ratings Badge Pill (Wise App Store / Play Store style) */}
          <div className="flex justify-center mb-8">
            <Reveal>
              <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs">
                <span className="flex items-center gap-1 text-slate-900">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>4.9 Rating</span>
                </span>
                <span className="text-slate-300">•</span>
                <span>Trusted by 1,200+ Nepali IT Exporters & Freelancers</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  NRB Sandbox Aligned
                </span>
              </div>
            </Reveal>
          </div>

          {/* The Massive Headline (Wise Style: SAVE WHEN YOU SEND WORLDWIDE) */}
          <div className="text-center max-w-5xl mx-auto">
            <Reveal delay={100}>
              <h1
                className="font-display text-5xl sm:text-7xl lg:text-[5.5rem] font-black tracking-tight text-[#0e131f] uppercase leading-[0.96]"
              >
                GET PAID WORLDWIDE. <br />
                <span className="text-emerald-600">SETTLE IN NPR.</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-8 max-w-3xl mx-auto text-lg sm:text-xl leading-relaxed text-slate-600 font-medium">
                The international payment gateway built specifically for Nepali IT companies, agencies, and freelancers.
                Receive foreign client payments with guaranteed mid-market exchange rates, zero hidden bank fees,
                and instant Bikram Sambat settlement advice.
              </p>
            </Reveal>

            {/* Wise Signature Lime CTA Button */}
            <Reveal delay={300}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#9FE870] hover:bg-[#8ee05b] px-9 py-4 text-lg font-black text-[#163300] shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Start receiving payments</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <a
                  href="#calculator"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-7 py-4 text-base font-bold text-slate-800 transition-all shadow-xs"
                >
                  <Calculator className="h-4 w-4 text-slate-600" />
                  <span>Try Rate Calculator</span>
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-400 font-medium">
                Instant 3-minute sandbox setup • No foreign bank account needed • Zero real money moved
              </p>
            </Reveal>
          </div>

          {/* Centerpiece Showcase: Live Wise Rate Calculator + 3D Interactive Nepal Globe */}
          <div className="mt-16 sm:mt-24">
            <Reveal delay={350}>
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
                {/* Left: The Interactive Rate Calculator */}
                <div className="lg:col-span-7 flex justify-center">
                  <WiseRateCalculator />
                </div>

                {/* Right: The 3D Interactive Nepal Global Nexus */}
                <div className="lg:col-span-5 flex flex-col items-center text-center">
                  <InteractiveGlobe />
                  <div className="mt-4 space-y-1">
                    <h4 className="font-display text-lg font-black text-slate-900">
                      Worldwide Client Inflow → Nepal NPR
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Accept USD, EUR, and GBP payments from clients in the US, UK, EU, and Australia with direct bank settlement.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── WHO WE SERVE SECTION (PRD §3 Exporter Personas) ──── */}
      <section id="who-we-serve" className="border-t border-slate-100 bg-slate-50/70 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                Designed For Nepal's Export Economy
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Empowering Nepal's $160M+ IT Exporters
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600">
                Whether you run an engineering studio in Kathmandu or freelance remotely from Pokhara,
                Himpaar removes foreign payment roadblocks.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: Building2,
                title: "Nepali IT Companies & Dev Studios",
                desc: "Billing $5,000 to $50,000+ monthly for US and European software engineering milestones. Eliminate $65+ correspondent wire deductions on every client invoice.",
                tag: "Agencies & SaaS",
              },
              {
                icon: UserCheck,
                title: "Tech Freelancers & Remote Engineers",
                desc: "Working with international clients via Upwork, Toptal, or direct contracts. Receive foreign currency payments directly into your Nepali bank without wallet account freeze risks.",
                tag: "Remote Workers",
              },
              {
                icon: Coins,
                title: "Digital Creators & Goods Exporters",
                desc: "Selling digital design assets, handicraft consignments, or consulting services abroad with automated Bikram Sambat export paperwork for hassle-free tax clearance.",
                tag: "Creators & Goods",
              },
            ].map((persona, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div className="h-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9FE870]/30 text-[#163300]">
                        <persona.icon className="h-6 w-6 text-emerald-800" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {persona.tag}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-slate-900">{persona.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{persona.desc}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-slate-900">
                    <span>Instant Link Creation Available</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5 text-emerald-600" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS IN 3 STEPS ─────────────────────────── */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                Simple & Transparent
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                How Himpaar Works
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600">
                From foreign invoice generation to local Nepali bank deposit in three frictionless steps.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Generate a 1-Minute Payment Link",
                desc: "Specify your invoice amount in USD, EUR, or GBP, set your client's name and milestone description, and get a secure shareable link.",
              },
              {
                num: "02",
                title: "Foreign Client Pays in Their Currency",
                desc: "Your international client pays seamlessly with their domestic cards or bank transfer. They don't need a Nepali bank account or complex wire forms.",
              },
              {
                num: "03",
                title: "Direct NPR Bank Settlement & Tax Advice",
                desc: "Funds are converted at the transparent mid-market rate and deposited directly into your Nepali bank. Download automated Bikram Sambat settlement advice.",
              },
            ].map((step, idx) => (
              <Reveal key={idx} delay={idx * 120}>
                <div className="relative rounded-3xl border border-slate-200 bg-slate-50/50 p-8 shadow-xs hover:shadow-md transition-all">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 font-display text-lg font-black text-white mb-6">
                    {step.num}
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Interactive Pipeline Showcase */}
          <div className="mt-16">
            <Reveal delay={200}>
              <HeroPipelineInteractive />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SETTLEMENT ADVICE SHOWCASE (Dual BS/AD Calendar) ─── */}
      <section id="advice-doc" className="bg-slate-50/80 py-24 sm:py-32 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SettlementAdviceShowcase />
          </Reveal>
        </div>
      </section>

      {/* ── COMPETITIVE INFRASTRUCTURE MATRIX ────────────────── */}
      <section className="bg-white py-24 sm:py-32 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                Transparent Comparison
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Himpaar vs Traditional Export Rails
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600">
                Engineered specifically to solve the hidden wire fees and Bikram Sambat tax hurdles faced by Nepali tech exporters.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <CompetitiveMatrix />
          </Reveal>
        </div>
      </section>

      {/* ── DEVELOPER SDK SECTION (Clean High Contrast) ─────── */}
      <section id="developers" className="bg-[#080c16] py-24 sm:py-32 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9FE870] bg-[#9FE870]/10 px-3.5 py-1 rounded-full border border-[#9FE870]/20">
                Developer First
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
                Integrate payment links in minutes
              </h2>
              <p className="mt-4 text-base sm:text-lg text-white/70">
                Full TypeScript SDK, standard REST APIs, HMAC-SHA256 signed webhooks, and sandbox testing.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-14">
              <DeveloperStudio />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── NRB & COMPLIANCE ALIGNMENT (PRD §9) ──────────────── */}
      <section className="bg-white py-20 sm:py-28 border-t border-slate-100">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Reveal>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-8 sm:p-12 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="h-6 w-6 text-emerald-700" />
                <h3 className="font-display text-2xl font-black text-slate-900">
                  Regulatory Integrity & Compliance Alignment
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Himpaar is designed from day one to operate in strict alignment with Nepal Rastra Bank's Payment Systems Department directives.
                Under our architecture, funds are held and converted by authorized licensed commercial banking partners.
                All transactions generate verifiable settlement records to support Nepal's formal IT export economy.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Bank-Partner Held Funds</span>
                  <span className="text-slate-500">Funds held & converted by licensed partner banks</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">NRB Sandbox Ready</span>
                  <span className="text-slate-500">Structured for NRB's fintech testing sandbox</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Full AML Audit Logging</span>
                  <span className="text-slate-500">Append-only ledger with automated compliance checks</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ACCORDION SECTION ───────────────────────────── */}
      <section id="faq" className="bg-slate-50/70 py-24 sm:py-32 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="mb-14 text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                Got Questions?
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Everything you need to know about testing Himpaar for your Nepali export business.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <FaqSection />
          </Reveal>
        </div>
      </section>

      {/* ── FINAL HIGH-IMPACT CTA BANNER (Wise Style) ───────── */}
      <section className="bg-white py-20 sm:py-28 border-t border-slate-100">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 text-center">
          <Reveal>
            <div className="rounded-3xl bg-[#9FE870]/20 border border-[#9FE870] p-10 sm:p-16">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#163300] bg-[#9FE870] px-3.5 py-1 rounded-full mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Join the Sandbox Today
              </span>

              <h2 className="font-display text-4xl sm:text-6xl font-black text-[#0e131f] tracking-tight uppercase leading-[0.98]">
                Start receiving global payments in Nepal
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-700 font-medium">
                Create your free sandbox account in 30 seconds. Generate test payment links, simulate foreign buyer
                payments, and inspect dual-calendar Bikram Sambat settlement advice.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-[#163300] hover:bg-black px-9 py-4 text-base font-black text-white shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Open Free Sandbox Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-8 py-4 text-base font-bold text-slate-800 transition-all shadow-xs"
                >
                  <span>Demo Sign In</span>
                </Link>
              </div>

              <p className="mt-5 text-xs text-slate-500 font-medium">
                No real money moved • No foreign bank account required • Instant developer keys
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PROFESSIONAL FOOTER ─────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            {/* Brand Column */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <HimpaarMark className="h-8 w-8 brightness-0 invert" />
                <span className="font-display text-2xl font-black tracking-tight text-white">
                  Himpaar
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-slate-400">
                International payment gateway and automated NPR settlement rail built for Nepali IT exporters,
                freelancers, and digital service agencies.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-mono text-slate-300">
                  Kathmandu, Nepal
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-mono text-emerald-400 border border-emerald-500/30">
                  ● Sandbox Live
                </span>
              </div>
            </div>

            {/* Product Links */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#calculator" className="hover:text-white transition-colors">NPR Calculator</a></li>
                <li><a href="#advice-doc" className="hover:text-white transition-colors">Settlement Advice</a></li>
                <li><a href="#who-we-serve" className="hover:text-white transition-colors">For Exporters</a></li>
              </ul>
            </div>

            {/* Developers Links */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
                Developers
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#developers" className="hover:text-white transition-colors">TypeScript SDK</a></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">API Keys</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Webhooks</Link></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Platform & Account */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
                Account
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Simulated KYC</Link></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Knowledge Base</a></li>
              </ul>
            </div>
          </div>

          {/* AGENTS.md §9 Legal & Regulatory Disclaimer */}
          <div className="mt-14 border-t border-slate-800 pt-8">
            <div className="rounded-2xl border border-slate-800 bg-white/[0.02] p-4 text-center">
              <p className="text-[11px] leading-relaxed text-slate-400">
                <strong>LEGAL & REGULATORY NOTICE (AGENTS.md §9):</strong> Himpaar is currently in sandbox preview mode.
                All payments, foreign exchange conversions, settlement transactions, and export documents are strictly
                simulated for demonstration and integration testing purposes. No real funds or fiat currency move.
                Himpaar is not licensed as a payment service operator (PSO) or payment service provider (PSP) by Nepal Rastra Bank,
                and does not hold commercial banking partnerships.
              </p>
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-4 text-xs text-slate-500 sm:flex-row">
              <p>© {new Date().getFullYear()} Himpaar Technologies. Built for Nepal's global exporters.</p>
              <div className="flex items-center gap-6">
                <span>Bikram Sambat 2083 Infrastructure</span>
                <span>•</span>
                <span>Nepal B2B Payments</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
