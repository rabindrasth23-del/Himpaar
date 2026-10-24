/**
 * Payment link detail — /dashboard/links/:id
 */
import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { usePaymentLink } from "../../api/hooks.ts";
import { Card, DetailList, ErrorState, PageHeader, PageSkeleton, SimulatedTag, StatusBadge } from "../../components/ui.tsx";
import { Amount, CopyButton } from "../../components/amount.tsx";
import { formatDate, formatDateOnly } from "../../lib/dates.ts";
import { absoluteUrl, payPath } from "../../lib/labels.ts";

export function PaymentLinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: link, isLoading, isError, error, refetch } = usePaymentLink(id ?? "");

  if (isLoading) return <PageSkeleton label="Loading payment link" rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!link) return <ErrorState error={new Error("Not found")} />;

  const url = absoluteUrl(payPath(link.token));

  return (
    <div>
      <PageHeader
        title={link.reference}
        description={link.description}
        back={
          <Link to="/dashboard/links" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Payment links
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={link.status} />
            <SimulatedTag />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <DetailList
            items={[
              { label: "Reference", value: link.reference },
              { label: "Amount", value: <Amount money={link.amount} simulated /> },
              { label: "Client", value: `${link.client_name} (${link.client_email})` },
              { label: "Due date", value: formatDateOnly(link.due_date) },
              { label: "Created", value: formatDate(link.created_at) },
              ...(link.paid_at ? [{ label: "Paid at", value: formatDate(link.paid_at) }] : []),
              ...(link.expired_at ? [{ label: "Expired at", value: formatDate(link.expired_at) }] : []),
            ]}
          />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text-primary">Payment link URL</h3>
          <p className="mt-1 text-xs text-text-secondary">Share this URL with your customer.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-slate-50 px-3 py-2 font-mono text-xs text-text-primary">
              {url}
            </code>
            <CopyButton text={url} label="Copy" />
            {link.status === "open" && (
              <Link
                to={payPath(link.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[13px] font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Sandbox only. No real payment will be processed.
          </p>
        </Card>
      </div>
    </div>
  );
}
