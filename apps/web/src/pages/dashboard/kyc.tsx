/**
 * KYC page — /dashboard/kyc
 * Simulated KYC: nothing is verified. Form is validated by the shared schema.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { KycInputSchema, type KycInput } from "@himpaar/shared";
import { useSubmitKyc, useSession } from "../../api/hooks.ts";
import { Button, Card, CardHeader, Field, Input, Badge, PageHeader } from "../../components/ui.tsx";
import { useToast, errorMessage } from "../../components/toast.tsx";

export function KycPage() {
  const session = useSession();
  const submitKyc = useSubmitKyc();
  const navigate = useNavigate();
  const toast = useToast();
  const merchant = session.data?.merchant;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KycInput>({
    resolver: zodResolver(KycInputSchema),
    mode: "onTouched",
    defaultValues: {
      company_name: merchant?.name ?? "",
      registration_number: merchant?.registration_number ?? "",
      pan_vat: merchant?.pan_vat ?? "",
    },
  });

  const alreadyDone = merchant?.kyc_status === "approved_sandbox";

  const onSubmit = handleSubmit((values) =>
    submitKyc.mutate(values, {
      onSuccess: () => {
        toast.success("KYC approved (simulated)", "Nothing was verified. This is a sandbox shortcut.");
        navigate("/dashboard", { replace: true });
      },
      onError: (e) => toast.error("KYC failed", errorMessage(e)),
    }),
  );

  return (
    <div>
      <PageHeader
        title="Company details"
        description="Simulated KYC — nothing is verified, the form is auto-approved."
      />
      {alreadyDone && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-4 py-3 text-sm text-text-primary">
          <Badge tone="success">Approved (sandbox)</Badge>
          <span>Your simulated KYC was already accepted.</span>
        </div>
      )}
      <Card>
        <CardHeader
          title="Company information"
          description="All fields are placeholders. Nothing is sent to any regulator."
        />
        <form className="space-y-4 px-5 py-5" onSubmit={onSubmit} noValidate>
          <Field id="kyc-company" label="Registered company name" error={errors.company_name?.message}>
            <Input
              id="kyc-company"
              placeholder="Everest Pixel Labs Pvt. Ltd."
              invalid={!!errors.company_name}
              {...register("company_name")}
            />
          </Field>
          <Field
            id="kyc-reg"
            label="Registration number"
            hint="Company registration number (simulated, not verified)"
            error={errors.registration_number?.message}
          >
            <Input id="kyc-reg" placeholder="123456/079/080" invalid={!!errors.registration_number} {...register("registration_number")} />
          </Field>
          <Field
            id="kyc-pan"
            label="PAN / VAT"
            hint="9 digits. Placeholder format, not verified."
            error={errors.pan_vat?.message}
          >
            <Input id="kyc-pan" placeholder="609876543" inputMode="numeric" invalid={!!errors.pan_vat} {...register("pan_vat")} />
          </Field>
          <div className="pt-2">
            <Button id="kyc-submit" type="submit" loading={submitKyc.isPending}>
              {alreadyDone ? "Re-submit (simulated)" : "Submit (simulated)"}
            </Button>
          </div>
        </form>
      </Card>
      <p className="mt-3 text-xs text-text-secondary">
        This is a sandbox. The form is auto-approved and nothing is verified.
      </p>
    </div>
  );
}
