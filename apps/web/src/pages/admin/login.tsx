import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router";
import { LoginInputSchema, type LoginInput } from "@himpaar/shared";
import { Shield } from "lucide-react";
import { useAdminLogin } from "../../api/hooks.ts";
import { HimpaarApiError } from "../../api/types.ts";
import { HimpaarLogo } from "../../components/brand.tsx";
import { Button, Field, Input } from "../../components/ui.tsx";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAdminLogin();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
  });

  const from = (location.state as { from?: string })?.from ?? "/admin";
  const busy = isSubmitting || login.isPending;

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    try {
      await login.mutateAsync(data);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof HimpaarApiError ? e.message : "Login failed");
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <HimpaarLogo />
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/8 px-3 py-1 text-xs font-semibold text-danger-fg">
            <Shield className="h-3 w-3" aria-hidden />
            ADMIN CONSOLE
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h1 className="font-display text-lg font-semibold text-text-primary">Admin sign in</h1>
          <p className="mt-1 text-sm text-text-secondary">Internal access only.</p>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger-fg animate-fade-up">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field id="admin-email" label="Email" error={errors.email?.message}>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="admin@himpaar.com"
                disabled={busy}
                invalid={!!errors.email}
                {...register("email")}
              />
            </Field>

            <Field id="admin-password" label="Password" error={errors.password?.message}>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                disabled={busy}
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>

            <Button type="submit" loading={busy} className="w-full">
              Sign in to Admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
