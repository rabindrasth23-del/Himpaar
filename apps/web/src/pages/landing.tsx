import { Link } from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ────────────────────────────────────────────────────────────
   Himpaar Landing Page
   AGENTS.md §9: no claims — all text is factual, sandbox-labeled.
   ──────────────────────────────────────────────────────────── */

// ── Brand mark (PNG for now, SVG TODO) ──────────────────────
function HimpaarMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/himpaar-mark.png"
      alt="Himpaar"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

// ── Scroll reveal wrapper ───────────────────────────────────
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
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
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s var(--ease-out) ${delay}ms, transform 0.6s var(--ease-out) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Static Globe (SVG, no dependencies) ─────────────────────
function Globe() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] lg:h-[500px] lg:w-[500px]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="globe-bg" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#e8e9f3" />
          <stop offset="100%" stopColor="#c8cae0" />
        </radialGradient>
        <radialGradient id="globe-glow" cx="50%" cy="50%" r="55%">
          <stop offset="85%" stopColor="transparent" />
          <stop offset="100%" stopColor="#e0e1ef" stopOpacity="0.4" />
        </radialGradient>
        <clipPath id="globe-clip">
          <circle cx="200" cy="200" r="170" />
        </clipPath>
      </defs>
      {/* Globe body */}
      <circle cx="200" cy="200" r="170" fill="url(#globe-bg)" />
      {/* Grid lines */}
      <g clipPath="url(#globe-clip)" opacity="0.2" fill="none" stroke="#8b8fa8" strokeWidth="0.7">
        {/* Latitude lines */}
        <ellipse cx="200" cy="120" rx="160" ry="20" />
        <ellipse cx="200" cy="160" rx="165" ry="35" />
        <ellipse cx="200" cy="200" rx="170" ry="45" />
        <ellipse cx="200" cy="240" rx="165" ry="35" />
        <ellipse cx="200" cy="280" rx="160" ry="20" />
        {/* Longitude arcs */}
        <ellipse cx="200" cy="200" rx="45" ry="170" />
        <ellipse cx="200" cy="200" rx="100" ry="170" />
        <ellipse cx="200" cy="200" rx="140" ry="170" />
        <ellipse cx="200" cy="200" rx="170" ry="170" />
      </g>
      {/* Landmass hints (simplified) */}
      <g clipPath="url(#globe-clip)" opacity="0.12" fill="#5049EE">
        <ellipse cx="250" cy="160" rx="50" ry="30" />
        <ellipse cx="280" cy="200" rx="30" ry="40" />
        <ellipse cx="180" cy="180" rx="45" ry="25" />
        <ellipse cx="140" cy="220" rx="25" ry="35" />
      </g>
      {/* Kathmandu marker (primary) */}
      <circle cx="270" cy="175" r="6" fill="#5049EE" opacity="0.9">
        <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="270" cy="175" r="3" fill="#5049EE" />
      {/* Other city markers */}
      <circle cx="130" cy="150" r="3" fill="#5049EE" opacity="0.5" />
      <circle cx="170" cy="155" r="3" fill="#5049EE" opacity="0.5" />
      <circle cx="310" cy="160" r="3" fill="#5049EE" opacity="0.5" />
      <circle cx="290" cy="220" r="2.5" fill="#5049EE" opacity="0.4" />
      <circle cx="150" cy="280" r="2.5" fill="#5049EE" opacity="0.3" />
      {/* Glow */}
      <circle cx="200" cy="200" r="180" fill="url(#globe-glow)" />
    </svg>
  );
}

// ── Floating product cards for hero ─────────────────────────
function FloatingCards() {
  return (
    <div className="relative h-[340px] w-[320px] sm:h-[400px] sm:w-[380px]" aria-hidden="true">
      {/* Payment link card */}
      <div
        className="absolute left-0 top-0 w-[260px] rounded-xl border border-white/10 bg-white/[0.07] p-4 shadow-lg backdrop-blur-sm"
        style={{ animation: "float1 6s ease-in-out infinite" }}
      >
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-300">Payment Link (simulated)</div>
        <div className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>$2,400.00</div>
        <div className="mt-1 text-sm text-white/60">Invoice #1042 — Acme Corp</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">● Paid</span>
        </div>
      </div>

      {/* Settlement card */}
      <div
        className="absolute left-8 top-28 w-[260px] rounded-xl border border-white/10 bg-white/[0.07] p-4 shadow-lg backdrop-blur-sm sm:top-32"
        style={{ animation: "float2 6s ease-in-out infinite" }}
      >
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-300">Settlement (simulated)</div>
        <div className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}>
          NPR 317,280.00
        </div>
        <div className="mt-1 text-sm text-white/60">Rate: 1 USD = 132.20 NPR</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-medium text-brand-300">● Settled</span>
        </div>
      </div>

      {/* Export document card */}
      <div
        className="absolute left-16 top-56 w-[260px] rounded-xl border border-white/10 bg-white/[0.07] p-4 shadow-lg backdrop-blur-sm sm:top-64"
        style={{ animation: "float3 6s ease-in-out infinite" }}
      >
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-300">Export Document</div>
        <div className="text-sm font-medium text-white">Himpaar Settlement Advice</div>
        <div className="mt-1 text-xs text-white/50">SIMULATED, NOT AN OFFICIAL DOCUMENT</div>
        <div className="mt-2 text-xs text-white/40">2082-07-24 BS • 2025-11-09 AD</div>
      </div>
    </div>
  );
}

// ── Steps data ──────────────────────────────────────────────
const steps = [
  { num: "01", title: "Create a payment link", desc: "Generate a unique, shareable link for your client with amount, currency, and invoice reference." },
  { num: "02", title: "Client pays (simulated)", desc: "Your client opens the link and completes a simulated payment in USD or other supported currencies." },
  { num: "03", title: "NPR settlement (simulated)", desc: "The payment converts to NPR at a simulated exchange rate and appears in your settlement record." },
  { num: "04", title: "Export document ready", desc: "Download a Himpaar Settlement Advice (simulated) with BS and AD dates for your records." },
];

// ── Code snippet for developer section ──────────────────────
const codeSnippet = `import { Himpaar } from "@himpaar/sdk";

const hp = new Himpaar({
  apiKey: "hp_test_...",  // sandbox key
});

// Create a payment link
const link = await hp.paymentLinks.create({
  amount: 240000,        // $2,400.00 in cents
  currency: "USD",
  description: "Invoice #1042",
  expiresIn: "7d",
});

console.log(link.url);
// → https://pay.himpaar.com/pl_...`;

const webhookSnippet = `// Verify webhook signature
import { verifyWebhook } from "@himpaar/sdk";

app.post("/webhooks/himpaar", (req, res) => {
  const event = verifyWebhook(
    req.body,
    req.headers,
    process.env.WEBHOOK_SECRET!
  );

  if (event.type === "payment.succeeded") {
    // event.data.amount, .currency, .paymentLinkId
  }

  res.status(200).send("ok");
});`;

// ── Main landing page ───────────────────────────────────────
export function LandingPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const snippets = [codeSnippet, webhookSnippet];
  const tabLabels = ["Create payment link", "Verify webhook"];

  function copyCode(idx: number) {
    navigator.clipboard.writeText(snippets[idx] ?? "");
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Sticky nav ─────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Himpaar home">
            <HimpaarMark size={28} />
            <span className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Himpaar
            </span>
          </Link>

          <div className="hidden items-center gap-8 sm:flex">
            <a href="#how-it-works" className="text-sm text-white/60 transition-colors hover:text-white">
              How it works
            </a>
            <a href="#developers" className="text-sm text-white/60 transition-colors hover:text-white">
              Developers
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.97]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-950">
        {/* Gradient mesh background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.20 0.08 276 / 0.5), transparent),
                radial-gradient(ellipse 60% 50% at 80% 30%, oklch(0.18 0.06 260 / 0.4), transparent),
                radial-gradient(ellipse 50% 40% at 50% 80%, oklch(0.15 0.04 240 / 0.3), transparent)
              `,
            }}
          />
        </div>

        {/* Mountain ridgeline SVG at bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32" aria-hidden="true">
          <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0,120 L0,80 Q120,30 240,65 Q340,15 440,50 Q540,5 640,40 Q720,10 800,35 Q900,0 1000,30 Q1100,10 1200,40 Q1300,20 1400,55 L1440,50 L1440,120 Z" fill="oklch(0.13 0.02 260 / 0.6)" />
            <path d="M0,120 L0,90 Q180,50 320,75 Q460,30 580,60 Q700,20 820,50 Q940,25 1060,55 Q1180,35 1300,65 L1440,60 L1440,120 Z" fill="oklch(0.11 0.02 258 / 0.8)" />
            <path d="M0,120 L0,100 Q200,70 400,90 Q600,60 800,85 Q1000,65 1200,88 L1440,80 L1440,120 Z" fill="oklch(0.10 0.01 256)" />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 pb-40 pt-20 sm:pb-48 sm:pt-28 lg:grid-cols-2 lg:gap-8 lg:pb-40 lg:pt-24">
          {/* Left: copy */}
          <div className="flex flex-col justify-center">
            {/* Sandbox badge */}
            <Reveal>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                Sandbox preview — no real money moves
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1
                className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                International payments for Nepali exporters
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/60">
                Create a payment link and get a clear settlement record and export document.
                Sandbox preview with simulated payments.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg active:scale-[0.97]"
                >
                  Try the sandbox
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
                >
                  See how it works
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right: floating product cards */}
          <div className="flex items-center justify-center lg:justify-end">
            <Reveal delay={400}>
              <FloatingCards />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <h2
              className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-500">
              Four steps from payment link to export document. All simulated in the sandbox.
            </p>
          </Reveal>

          <div className="relative mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connecting line */}
            <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent lg:block" aria-hidden="true" />

            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
                       style={{ fontFamily: "var(--font-display)" }}>
                    {step.num}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Export document preview ─────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Settlement advice for your records
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                Each settlement generates a document with BS and AD dates, amounts, exchange rate, and a unique reference. Ready for your accountant.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Payment links", "Settlement records", "Export documents", "Developer SDK"].map((chip) => (
                  <span key={chip} className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                    {chip}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <HimpaarMark size={24} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                      Himpaar Settlement Advice
                    </div>
                    <div className="text-xs text-red-600 font-medium">SIMULATED, NOT AN OFFICIAL DOCUMENT</div>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Reference</span>
                    <span className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>HP-2025-001042</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Date (BS)</span>
                    <span className="font-medium text-slate-900">2082-07-24</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Date (AD)</span>
                    <span className="font-medium text-slate-900">2025-11-09</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Received</span>
                    <span className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>USD 2,400.00</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Exchange rate</span>
                    <span className="font-medium text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>1 USD = 132.20 NPR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Settlement</span>
                    <span className="text-lg font-bold text-brand-600" style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-display)" }}>
                      NPR 317,280.00
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                  Sandbox preview. All payments, rates and documents are simulated.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── For developers ─────────────────────────────── */}
      <section id="developers" className="bg-navy-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <h2
              className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              For developers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-white/50">
              TypeScript SDK, webhook verification, and RESTful API. Everything in sandbox mode.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mx-auto mt-12 max-w-2xl">
              {/* Tabs */}
              <div className="flex gap-1 rounded-t-lg border border-b-0 border-white/10 bg-white/5 p-1">
                {tabLabels.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setActiveTab(i)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === i
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div className="relative overflow-hidden rounded-b-lg border border-white/10 bg-[#0d1117]">
                <button
                  onClick={() => copyCode(activeTab)}
                  className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {copiedIdx === activeTab ? "Copied!" : "Copy"}
                </button>
                <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
                  <code className="text-white/80" style={{ fontFamily: "var(--font-mono)" }}>
                    {snippets[activeTab]}
                  </code>
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Globe section ──────────────────────────────── */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <h2
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Payments from anywhere, settled in Nepal
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                Create payment links that work globally. Settlements are recorded in NPR
                with BS and AD dates. All simulated in the sandbox.
              </p>

              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">What&apos;s built</h3>
                {["Payment links with unique tokens", "Simulated foreign payment flow", "NPR settlement with exchange rate", "Export document (Settlement Advice)", "TypeScript SDK and webhooks", "Merchant dashboard"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs">✓</span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Roadmap (not built)</h3>
                {["Real card/ACH/SEPA/SWIFT payments", "USD settlement option", "Annual tax statements", "Invoice financing", "Other countries"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">—</span>
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex justify-center">
                <Globe />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────── */}
      <section className="bg-navy-950 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Try the sandbox
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Create an account and explore payment links, settlements, and export documents.
              Everything is simulated — no real money moves.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg active:scale-[0.97]"
              >
                Create sandbox account
              </Link>
              <a
                href="#developers"
                className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
              >
                Read the docs
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-navy-950 py-10">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <HimpaarMark size={20} />
              <span className="text-sm font-medium text-white/60">Himpaar</span>
            </div>
            <p className="max-w-md text-center text-xs text-white/30 sm:text-right">
              Sandbox preview. All payments, rates and documents are simulated.
              No real money moves. Not partnered with a bank. Not licensed. Not live.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating card animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(0deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(0.5deg); }
          50% { transform: translateY(-6px) rotate(-0.5deg); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes float1 { 0%, 100% { transform: none; } }
          @keyframes float2 { 0%, 100% { transform: none; } }
          @keyframes float3 { 0%, 100% { transform: none; } }
        }
      `}</style>
    </div>
  );
}
