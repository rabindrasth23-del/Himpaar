/**
 * Payment detail — /dashboard/payments/:id
 */
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { usePayment } from "../../api/hooks.ts";
import { Card, DetailList, ErrorState, PageHeader, PageSkeleton, SimulatedTag, StatusBadge } from "../../components/ui.tsx";
import { Amount } from "../../components/amount.tsx";
import { formatDate } from "../../lib/dates.ts";
import { METHOD_LABEL } from "../../lib/labels.ts";
import { countryName } from "../../lib/labels.ts";

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading, isError, error, refetch } = usePayment(id ?? "");

  if (isLoading) return <PageSkeleton label="Loading payment" rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!p) return <ErrorState error={new Error("Not found")} />;

  return (
    <div>
      <PageHeader
        title={`Payment ${p.id.slice(0, 8)}…`}
        description="Simulated payment detail"
        back={
          <Link to="/dashboard/payments" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Payments
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={p.status} />
            <SimulatedTag />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <DetailList
            items={[
              { label: "Payment ID", value: <code className="font-mono text-xs">{p.id}</code> },
              { label: "Link ID", value: <Link to={`/dashboard/links/${p.payment_link_id}`} className="font-mono text-xs text-brand-600 hover:underline">{p.payment_link_id.slice(0, 8)}…</Link> },
              { label: "Reference", value: p.reference },
              { label: "Payer", value: `${p.payer_name} (${countryName(p.payer_country)})` },
              { label: "Method", value: METHOD_LABEL[p.method] },
            ]}
          />
        </Card>
        <Card>
          <DetailList
            items={[
              { label: "Amount", value: <Amount money={p.amount} simulated /> },
              { label: "Created", value: formatDate(p.created_at) },
              ...(p.pending_at ? [{ label: "Pending at", value: formatDate(p.pending_at) }] : []),
              ...(p.succeeded_at ? [{ label: "Succeeded at", value: formatDate(p.succeeded_at) }] : []),
              ...(p.failed_at ? [{ label: "Failed at", value: formatDate(p.failed_at) }] : []),
              ...(p.expired_at ? [{ label: "Expired at", value: formatDate(p.expired_at) }] : []),
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
