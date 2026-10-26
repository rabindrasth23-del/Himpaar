import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import { LoginInputSchema, type LoginInput } from "@himpaar/shared";
import { FlaskConical } from "lucide-react";
import { useLogin } from "../../api/hooks.ts";
import { API_MODE } from "../../api/index.ts";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../../api/mock/data.ts";
import { Button, Field, Input, PasswordInput } from "../../components/ui.tsx";
import { errorMessage } from "../../components/toast.tsx";

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema), mode: "onTouched" });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
    }),
  );

  const useDemo = () => {
    setValue("email", DEMO_EMAIL, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  };

  const isLoading = login.isPending || isSubmitting;

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-slate-900">Sign in to Himpaar</h1>
      <p className="mt-1.5 text-sm text-slate-500">Access your sandbox exporter merchant dashboard.</p>

      {API_MODE === "mock" && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-info-fg" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-medium text-brand-900">Demo account (sample data)</p>
            <p className="mt-0.5 break-all text-slate-700">{DEMO_EMAIL}</p>
          </div>
          <Button id="use-demo-account" size="sm" variant="secondary" onClick={useDemo}>
            Fill in
          </Button>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="login-email" label="Email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            invalid={!!errors.email}
            disabled={isLoading}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Field id="login-password" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            invalid={!!errors.password}
            disabled={isLoading}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            {...register("password")}
          />
        </Field>

        {login.isError && (
          <div
            role="alert"
            className="animate-fade-up rounded-md border border-danger/25 bg-danger/5 px-3 py-2.5 text-[13px] text-danger-fg"
          >
            <p className="font-medium">{errorMessage(login.error)}</p>
            <p className="mt-0.5 text-[12px] text-danger-fg/70">
              {API_MODE === "mock" ? "Try using the demo account above." : "Check your credentials and try again."}
            </p>
          </div>
        )}

        <Button id="login-submit" type="submit" className="w-full" loading={isLoading}>
          {isLoading ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        New to Himpaar?{" "}
        <Link to="/signup" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          Create a sandbox account
        </Link>
      </p>
    </>
  );
}
