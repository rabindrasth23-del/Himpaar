/**
 * Payments list — /dashboard/payments
 */
import { Link, useNavigate } from "react-router";
import { usePayments, usePaymentLinks } from "../../api/hooks.ts";
import { Card, EmptyState, ErrorState, PageHeader, PageSkeleton, SimulatedTag, StatusBadge, Table, Td, Th, Tr } from "../../components/ui.tsx";
import { formatMoney } from "../../lib/money.ts";
import { formatDate } from "../../lib/dates.ts";
import type { Payment, PaymentLink } from "@himpaar/shared";

export function PaymentsPage() {
  const { data, isLoading, isError, error, refetch } = usePayments();
  const links = usePaymentLinks();

  if (isLoading) return <PageSkeleton label="Loading payments" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const payments = data ?? [];
  const linkMap = new Map((links.data ?? []).map((l) => [l.id, l]));

  return (
    <div>
      <PageHeader
        title="Payments"
        description="All simulated payments across your payment links."
      />

      <Card>
        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payments appear here after a customer completes a payment link."
          />
        ) : (
          <Table label="Payments">
            <thead>
              <tr>
                <Th>Payment ID</Th>
                <Th>Link</Th>
                <Th>Method</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} link={linkMap.get(p.payment_link_id)} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function PaymentRow({ payment: p, link }: { payment: Payment; link?: PaymentLink }) {
  const navigate = useNavigate();
  return (
    <Tr onOpen={() => navigate(`/dashboard/payments/${p.id}`)}>
      <Td>
        <Link
          to={`/dashboard/payments/${p.id}`}
          className="font-mono text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
        >
          {p.id.slice(0, 8)}…
        </Link>
      </Td>
      <Td>{link?.reference ?? p.payment_link_id.slice(0, 8)}</Td>
      <Td className="capitalize text-text-secondary">{p.method}</Td>
      <Td align="right" className="tnum whitespace-nowrap font-medium">{formatMoney(p.amount.amount_minor, p.amount.currency)}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <StatusBadge status={p.status} />
          <SimulatedTag />
        </div>
      </Td>
      <Td className="whitespace-nowrap text-text-secondary">{formatDate(p.created_at)}</Td>
    </Tr>
  );
}
