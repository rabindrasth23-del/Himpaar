import { Link, Outlet } from "react-router";
import { HimpaarLogo } from "../components/brand.tsx";
import { TestModeBanner } from "./dashboard-layout.tsx";

/**
 * Auth layout: centred card on a quiet background. Used for /login and /signup.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-secondary">
      <TestModeBanner />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        {/* Soft brand glow behind the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-20%] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.524_0.238_276/0.10),transparent)]"
        />
        <div className="animate-fade-up relative w-full max-w-[400px]">
          <div className="mb-8 flex justify-center">
            <Link to="/" aria-label="Himpaar home" className="rounded-md">
              <HimpaarLogo />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card),var(--shadow-md)] sm:p-8">
            <Outlet />
          </div>
          <p className="mt-6 text-center text-xs text-text-secondary">
            Sandbox preview. All payments, rates and documents are simulated. No real money moves.
          </p>
        </div>
      </main>
    </div>
  );
}
