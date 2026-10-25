import { Link, useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useAdminMerchants } from "../../api/hooks.ts";
import { formatDate } from "../../lib/dates.ts";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "../../components/ui.tsx";

export function AdminMerchantsPage() {
  const { data, isLoading, isError, error, refetch } = useAdminMerchants();
  const navigate = useNavigate();

  if (isLoading) return <PageSkeleton label="Loading merchants" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const merchants = data ?? [];

  return (
    <div>
      <PageHeader title="Merchants" description={`${merchants.length} merchant${merchants.length !== 1 ? "s" : ""} registered.`} />
      <Card>
        {merchants.length === 0 ? (
          <EmptyState title="No merchants" description="Merchants will appear here once they sign up." />
        ) : (
          <Table label="Merchants">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Owner email</Th>
                <Th>Users</Th>
                <Th>KYC</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <Tr key={m.id} onOpen={() => navigate(`/admin/merchants/${m.id}`)}>
                  <Td>
                    <Link
                      to={`/admin/merchants/${m.id}`}
                      className="font-medium text-brand-600 underline-offset-2 hover:underline"
                    >
                      {m.name}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{m.owner_email ?? "—"}</Td>
                  <Td>{m.user_count}</Td>
                  <Td>
                    <StatusBadge status={m.kyc_status === "approved_sandbox" ? "active" : "pending"} />
                  </Td>
                  <Td>
                    {m.suspended ? (
                      <Badge tone="danger"><AlertTriangle className="h-3 w-3" /> Suspended</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-text-secondary">{formatDate(m.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
