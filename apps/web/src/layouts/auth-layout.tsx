import { Outlet } from "react-router";

/**
 * Auth layout — centered card on a subtle gradient background.
 * Used for /login and /signup.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-secondary px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand-600">
            Himpaar
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Cross-border payment infrastructure for Nepal
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-xl border border-border bg-surface-elevated p-8 shadow-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
