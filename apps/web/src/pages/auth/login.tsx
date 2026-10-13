import { Link } from "react-router";

export function LoginPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Sign in</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Enter your credentials to access the dashboard.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-text-primary">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-text-primary">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={10}
            maxLength={128}
            className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="••••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Create one
        </Link>
      </p>
    </>
  );
}
