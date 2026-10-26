import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { SignupInputSchema, type SignupInput } from "@himpaar/shared";
import { useSignup } from "../../api/hooks.ts";
import { Button, Field, Input, PasswordInput } from "../../components/ui.tsx";
import { errorMessage } from "../../components/toast.tsx";

export function SignupPage() {
  const signup = useSignup();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(SignupInputSchema), mode: "onTouched" });

  const onSubmit = handleSubmit((values) =>
    signup.mutate(values, {
      onSuccess: () => navigate("/dashboard/kyc", { replace: true }),
    }),
  );

  const isLoading = signup.isPending || isSubmitting;

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-slate-900">Create sandbox account</h1>
      <p className="mt-1.5 text-sm text-slate-500">Test cross-border payment links and NPR settlements with simulated data.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="signup-company" label="Company name" error={errors.company_name?.message}>
          <Input
            id="signup-company"
            autoComplete="organization"
            placeholder="Everest Pixel Labs Pvt. Ltd."
            invalid={!!errors.company_name}
            disabled={isLoading}
            aria-describedby={errors.company_name ? "signup-company-error" : undefined}
            {...register("company_name")}
          />
        </Field>
        <Field id="signup-email" label="Work email" error={errors.email?.message}>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            invalid={!!errors.email}
            disabled={isLoading}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Field
          id="signup-password"
          label="Password"
          hint="At least 10 characters."
          error={errors.password?.message}
        >
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            invalid={!!errors.password}
            disabled={isLoading}
            aria-describedby={errors.password ? "signup-password-error" : "signup-password-hint"}
            {...register("password")}
          />
        </Field>

        {signup.isError && (
          <div
            role="alert"
            className="animate-fade-up rounded-md border border-danger/25 bg-danger/5 px-3 py-2.5 text-[13px] text-danger-fg"
          >
            <p className="font-medium">{errorMessage(signup.error)}</p>
          </div>
        )}

        <Button id="signup-submit" type="submit" className="w-full" loading={isLoading}>
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
