import { BarChart3, CreditCard, Landmark, Store, AlertTriangle } from "lucide-react";
import { Link } from "react-router";
import { useAdminOverview } from "../../api/hooks.ts";
import { formatMoney } from "../../lib/money.ts";
import { formatDate } from "../../lib/dates.ts";
import {
  Badge,
  Card,
  ErrorState,
  PageHeader,
  PageSkeleton,
  SimulatedTag,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "../../components/ui.tsx";

export function AdminOverviewPage() {
  const { data, isLoading, isError, error, refetch } = useAdminOverview();

  if (isLoading) return <PageSkeleton label="Loading admin overview" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Admin overview"
        description="Platform-wide summary across all merchants."
        actions={<SimulatedTag label="Sandbox data" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Merchants"
          value={data.merchants_total}
          icon={<Store className="h-4 w-4" />}
          hint={
            <>
              {data.merchants_pending_kyc > 0 && (
                <span className="text-warning-fg">{data.merchants_pending_kyc} pending KYC</span>
              )}
              {data.merchants_suspended > 0 && (
                <span className="ml-2 text-danger-fg">{data.merchants_suspended} suspended</span>
              )}
            </>
          }
        />
        <StatCard
          label="Gross volume (succeeded)"
          value={formatMoney(data.gross_volume.amount_minor, data.gross_volume.currency)}
          icon={<BarChart3 className="h-4 w-4" />}
          hint={`Fees earned: ${formatMoney(data.fees_earned.amount_minor, data.fees_earned.currency)}`}
        />
        <StatCard
          label="Payments"
          value={data.payments_succeeded}
          icon={<CreditCard className="h-4 w-4" />}
          hint={
            <>
              {data.payments_pending > 0 && <span className="text-warning-fg">{data.payments_pending} pending</span>}
              {data.payments_failed > 0 && <span className="ml-2 text-danger-fg">{data.payments_failed} failed</span>}
            </>
          }
        />
        <StatCard
          label="Pending settlements"
          value={data.settlements_pending}
          icon={<Landmark className="h-4 w-4" />}
          hint={`${formatMoney(data.settlements_pending_npr.amount_minor, data.settlements_pending_npr.currency)} to pay out`}
        />
      </div>

      {/* Recent merchants */}
      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-display text-sm font-semibold text-text-primary">Recent merchants</h2>
          <Link to="/admin/merchants" className="text-xs font-medium text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        <Table label="Recent merchants">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Owner</Th>
              <Th>KYC</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {data.recent_merchants.map((m) => (
              <Tr key={m.id} onOpen={undefined}>
                <Td>
                  <Link
                    to={`/admin/merchants/${m.id}`}
                    className="font-medium text-brand-600 underline-offset-2 hover:underline"
                  >
                    {m.name}
                  </Link>
                </Td>
                <Td className="text-text-secondary">{m.owner_email ?? "—"}</Td>
                <Td>
                  <StatusBadge status={m.kyc_status === "approved_sandbox" ? "active" : "pending"} />
                </Td>
                <Td>
                  {m.suspended ? (
                    <Badge tone="danger">
                      <AlertTriangle className="h-3 w-3" /> Suspended
                    </Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-text-secondary">{formatDate(m.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
