import { useAdminSettlements, useAdminMarkSettlementPaid } from "../../api/hooks.ts";
import { formatMoney } from "../../lib/money.ts";
import { formatDate } from "../../lib/dates.ts";
import { useToast, errorMessage } from "../../components/toast.tsx";
import {
  Button,
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
import { Banknote } from "lucide-react";

export function AdminSettlementsPage() {
  const { data, isLoading, isError, error, refetch } = useAdminSettlements();
  const markPaid = useAdminMarkSettlementPaid();
  const toast = useToast();

  if (isLoading) return <PageSkeleton label="Loading settlements" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const settlements = data ?? [];

  const handleMarkPaid = (id: string) => {
    markPaid.mutate(id, {
      onSuccess: () => { toast.success("Settlement marked as paid"); refetch(); },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  return (
    <div>
      <PageHeader title="Settlements" description="All settlements across every merchant. Mark pending settlements as paid out." />
      <Card>
        {settlements.length === 0 ? (
          <EmptyState title="No settlements" description="Settlements appear when payments succeed." />
        ) : (
          <Table label="Settlements" minWidth={900}>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Reference</Th>
                <Th align="right">Gross (USD)</Th>
                <Th align="right">Fee</Th>
                <Th align="right">Net (NPR)</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-mono text-xs text-brand-600">{s.id}</Td>
                  <Td>{s.reference}</Td>
                  <Td align="right" className="tnum whitespace-nowrap font-medium">
                    {formatMoney(s.gross.amount_minor, s.gross.currency)}
                  </Td>
                  <Td align="right" className="tnum whitespace-nowrap text-text-secondary">
                    {formatMoney(s.fee.amount_minor, s.fee.currency)}
                  </Td>
                  <Td align="right" className="tnum whitespace-nowrap font-medium">
                    {formatMoney(s.net_npr.amount_minor, s.net_npr.currency)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      <SimulatedTag />
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-text-secondary">{formatDate(s.created_at)}</Td>
                  <Td>
                    {s.status === "pending" && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={markPaid.isPending}
                        onClick={() => handleMarkPaid(s.id)}
                      >
                        <Banknote className="h-3.5 w-3.5" /> Pay out
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
