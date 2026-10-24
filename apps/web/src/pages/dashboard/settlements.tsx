/**
 * Settlements list — /dashboard/settlements
 */
import { Link, useNavigate } from "react-router";
import { useSettlements } from "../../api/hooks.ts";
import { Card, EmptyState, ErrorState, PageHeader, PageSkeleton, SimulatedTag, StatusBadge, Table, Td, Th, Tr } from "../../components/ui.tsx";
import { formatMoney } from "../../lib/money.ts";
import { formatDate } from "../../lib/dates.ts";
import type { Settlement } from "@himpaar/shared";

export function SettlementsPage() {
  const { data, isLoading, isError, error, refetch } = useSettlements();

  if (isLoading) return <PageSkeleton label="Loading settlements" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const items = data ?? [];

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Simulated settlement records. Nothing is deposited."
      />
      <Card>
        {items.length === 0 ? (
          <EmptyState
            title="No settlements yet"
            description="Settlements are created when a simulated payment succeeds."
          />
        ) : (
          <Table label="Settlements">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th align="right">Gross</Th>
                <Th align="right">Fee</Th>
                <Th align="right">Net NPR</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <SettlementRow key={s.id} settlement={s} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function SettlementRow({ settlement: s }: { settlement: Settlement }) {
  const navigate = useNavigate();
  return (
    <Tr onOpen={() => navigate(`/dashboard/settlements/${s.id}`)}>
      <Td>
        <Link
          to={`/dashboard/settlements/${s.id}`}
          className="font-medium text-text-primary underline-offset-2 hover:underline"
        >
          {s.reference}
        </Link>
      </Td>
      <Td align="right" className="tnum whitespace-nowrap">{formatMoney(s.gross.amount_minor, s.gross.currency)}</Td>
      <Td align="right" className="tnum whitespace-nowrap text-text-secondary">{formatMoney(s.fee.amount_minor, s.fee.currency)}</Td>
      <Td align="right" className="tnum whitespace-nowrap font-medium">{formatMoney(s.net_npr.amount_minor, "NPR")}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <StatusBadge status={s.status} />
          <SimulatedTag />
        </div>
      </Td>
      <Td className="whitespace-nowrap text-text-secondary">{formatDate(s.created_at)}</Td>
    </Tr>
  );
}
