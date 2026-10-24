/**
 * Payment links — /dashboard/links
 * Lists all payment links with a "Create link" dialog.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreatePaymentLinkFormSchema, type CreatePaymentLinkForm } from "@himpaar/shared";
import { ExternalLink, Plus } from "lucide-react";
import { useCreatePaymentLink, usePaymentLinks } from "../../api/hooks.ts";
import {
  Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, PageSkeleton,
  SimulatedTag, StatusBadge, Table, Td, Th, Tr,
} from "../../components/ui.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { CopyButton } from "../../components/amount.tsx";
import { useToast, errorMessage } from "../../components/toast.tsx";
import { formatMoney, parseMajorToMinor } from "../../lib/money.ts";
import { formatDate } from "../../lib/dates.ts";
import { absoluteUrl, payPath } from "../../lib/labels.ts";

export function PaymentLinksPage() {
  const { data, isLoading, isError, error, refetch } = usePaymentLinks();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <PageSkeleton label="Loading payment links" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const links = data ?? [];

  return (
    <div>
      <PageHeader
        title="Payment links"
        description="Create and manage payment links for your customers. All links are simulated."
        actions={
          <Button id="create-link-btn" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Create link
          </Button>
        }
      />

      <Card>
        {links.length === 0 ? (
          <EmptyState
            title="No payment links yet"
            description="Create your first link to generate a checkout page for your customer."
            action={<Button onClick={() => setCreating(true)} size="sm"><Plus className="h-3.5 w-3.5" aria-hidden /> Create link</Button>}
          />
        ) : (
          <Table label="Payment links">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Client</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <LinkRow key={l.id} link={l} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <CreateLinkDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

/* ── Row ─────────────────────────────────────────────────────── */
import type { PaymentLink } from "@himpaar/shared";

function LinkRow({ link }: { link: PaymentLink }) {
  const navigate = useNavigate();
  return (
    <Tr onOpen={() => navigate(`/dashboard/links/${link.id}`)}>
      <Td>
        <Link
          to={`/dashboard/links/${link.id}`}
          className="font-medium text-text-primary underline-offset-2 hover:underline"
        >
          {link.reference}
        </Link>
      </Td>
      <Td>{link.client_name}</Td>
      <Td align="right" className="tnum whitespace-nowrap font-medium">
        {formatMoney(link.amount.amount_minor, link.amount.currency)}
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <StatusBadge status={link.status} />
          <SimulatedTag />
        </div>
      </Td>
      <Td className="whitespace-nowrap text-text-secondary">{formatDate(link.created_at)}</Td>
      <Td align="right">
        <div className="flex items-center justify-end gap-2">
          <CopyButton text={absoluteUrl(payPath(link.token))} label="Copy URL" />
          {link.status === "open" && (
            <Link
              to={payPath(link.token)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[13px] font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
              aria-label={`Open payer page for ${link.reference}`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open
            </Link>
          )}
        </div>
      </Td>
    </Tr>
  );
}

/* ── Create dialog ───────────────────────────────────────────── */
function CreateLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePaymentLink();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePaymentLinkForm>({
    resolver: zodResolver(CreatePaymentLinkFormSchema),
    mode: "onTouched",
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    const amountMinor = parseMajorToMinor(values.amount_usd, "USD");
    if (amountMinor === null) return;
    create.mutate(
      {
        input: {
          amount: { amount_minor: amountMinor.toString(), currency: "USD" },
          description: values.description,
          client_name: values.client_name,
          client_email: values.client_email,
          due_date: values.due_date,
        },
        idempotencyKey: crypto.randomUUID(),
      },
      {
        onSuccess: (link) => {
          toast.success("Payment link created", `${link.reference} — ${formatMoney(link.amount.amount_minor, link.amount.currency)}`);
          close();
          navigate(`/dashboard/links/${link.id}`);
        },
        onError: (e) => toast.error("Failed to create link", errorMessage(e)),
      },
    );
  });

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create payment link"
      description="Generate a checkout page for your customer. All values are simulated."
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button id="submit-create-link" type="submit" form="create-link-form" loading={create.isPending}>
            Create link
          </Button>
        </>
      }
    >
      <form id="create-link-form" className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="cl-amount" label="Amount (USD)" error={errors.amount_usd?.message}>
          <Input
            id="cl-amount"
            placeholder="1000.00"
            inputMode="decimal"
            invalid={!!errors.amount_usd}
            {...register("amount_usd")}
          />
        </Field>
        <Field id="cl-desc" label="Description" error={errors.description?.message}>
          <Input id="cl-desc" placeholder="Website development, October" invalid={!!errors.description} {...register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cl-name" label="Client name" error={errors.client_name?.message}>
            <Input id="cl-name" placeholder="Acme Corp" invalid={!!errors.client_name} {...register("client_name")} />
          </Field>
          <Field id="cl-email" label="Client email" error={errors.client_email?.message}>
            <Input id="cl-email" type="email" placeholder="billing@acme.com" invalid={!!errors.client_email} {...register("client_email")} />
          </Field>
        </div>
        <Field id="cl-due" label="Due date" error={errors.due_date?.message}>
          <Input id="cl-due" type="date" invalid={!!errors.due_date} {...register("due_date")} />
        </Field>
      </form>
    </Dialog>
  );
}
