import { Link } from "react-router";

export function SignupPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Create account</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Set up your merchant account to start accepting payments.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-text-primary">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-text-primary">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-text-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="At least 10 characters"
          />
          <p className="mt-1 text-xs text-text-muted">
            Minimum 10 characters. Must not match your email.
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </>
  );
}
