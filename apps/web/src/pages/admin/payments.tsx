import { useAdminPayments } from "../../api/hooks.ts";
import { formatMoney } from "../../lib/money.ts";
import { formatDate } from "../../lib/dates.ts";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  SimulatedTag,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "../../components/ui.tsx";

export function AdminPaymentsPage() {
  const { data, isLoading, isError, error, refetch } = useAdminPayments();

  if (isLoading) return <PageSkeleton label="Loading payments" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const payments = data ?? [];

  return (
    <div>
      <PageHeader title="Payments" description="All payments across every merchant." />
      <Card>
        {payments.length === 0 ? (
          <EmptyState title="No payments" description="Payments will appear after customers pay." />
        ) : (
          <Table label="Payments">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Reference</Th>
                <Th>Payer</Th>
                <Th>Method</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-mono text-xs text-brand-600">{p.id}</Td>
                  <Td>{p.reference}</Td>
                  <Td>{p.payer_name}</Td>
                  <Td className="capitalize text-text-secondary">{p.method}</Td>
                  <Td align="right" className="tnum whitespace-nowrap font-medium">
                    {formatMoney(p.amount.amount_minor, p.amount.currency)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <SimulatedTag />
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-text-secondary">{formatDate(p.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
