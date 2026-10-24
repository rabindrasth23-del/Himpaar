/**
 * Settlement detail — /dashboard/settlements/:id
 */
import { Link, useParams } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useSettlement, useDocuments } from "../../api/hooks.ts";
import { Card, DetailList, ErrorState, PageHeader, PageSkeleton, SimulatedTag, StatusBadge } from "../../components/ui.tsx";
import { Amount } from "../../components/amount.tsx";
import { formatDate } from "../../lib/dates.ts";

export function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: s, isLoading, isError, error, refetch } = useSettlement(id ?? "");
  const docs = useDocuments();

  if (isLoading) return <PageSkeleton label="Loading settlement" rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!s) return <ErrorState error={new Error("Not found")} />;

  const relatedDoc = (docs.data ?? []).find((d) => d.settlement_id === s.id);

  return (
    <div>
      <PageHeader
        title={s.reference}
        description="Simulated settlement detail"
        back={
          <Link to="/dashboard/settlements" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Settlements
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={s.status} />
            <SimulatedTag />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <DetailList
            items={[
              { label: "Reference", value: s.reference },
              { label: "Payment", value: <Link to={`/dashboard/payments/${s.payment_id}`} className="font-mono text-xs text-brand-600 hover:underline">{s.payment_id.slice(0, 12)}…</Link> },
              { label: "Fee rate", value: <span className="tnum">{s.fee_bps} bps</span> },
              { label: "Created", value: formatDate(s.created_at) },
              ...(s.settled_at ? [{ label: "Settled at", value: formatDate(s.settled_at) }] : []),
              ...(s.failed_at ? [{ label: "Failed at", value: formatDate(s.failed_at) }] : []),
            ]}
          />
        </Card>
        <Card>
          <DetailList
            items={[
              { label: "Gross", value: <Amount money={s.gross} simulated /> },
              { label: "Fee", value: <Amount money={s.fee} simulated /> },
              { label: "Net (USD)", value: <Amount money={s.net_usd} simulated className="font-semibold" /> },
              { label: "FX rate", value: <span className="inline-flex items-center gap-1.5 tnum">{s.rate_micro} ({s.rate_label}) <SimulatedTag /></span> },
              { label: "Net (NPR)", value: <Amount money={s.net_npr} simulated className="font-semibold" /> },
            ]}
          />
        </Card>
      </div>

      {/* Related document */}
      {relatedDoc && (
        <Card className="mt-6 p-5">
          <h3 className="text-sm font-semibold text-text-primary">Settlement advice document</h3>
          <p className="mt-1 text-xs text-text-secondary">{relatedDoc.title}</p>
          <Link
            to={`/dashboard/documents/${relatedDoc.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> View document
          </Link>
        </Card>
      )}
    </div>
  );
}
