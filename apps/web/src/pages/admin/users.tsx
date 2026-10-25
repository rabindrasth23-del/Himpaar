import { Ban, CheckCircle2, Clock } from "lucide-react";
import { useAdminUsers } from "../../api/hooks.ts";
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
import { Link } from "react-router";

export function AdminUsersPage() {
  const { data, isLoading, isError, error, refetch } = useAdminUsers();

  if (isLoading) return <PageSkeleton label="Loading users" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const users = data ?? [];

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} registered user${users.length !== 1 ? "s" : ""} across all merchants. Monitor signups, logins, and activity.`}
      />
      <Card>
        {users.length === 0 ? (
          <EmptyState title="No users yet" description="Users will appear here once they sign up." />
        ) : (
          <Table label="Users" minWidth={800}>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Company</Th>
                <Th>KYC</Th>
                <Th>Status</Th>
                <Th>Logins</Th>
                <Th>Last login</Th>
                <Th>Signed up</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <span className="font-medium text-text-primary">{u.email}</span>
                  </Td>
                  <Td>
                    <Link
                      to={`/admin/merchants/${u.merchant_id}`}
                      className="text-brand-600 underline-offset-2 hover:underline"
                    >
                      {u.merchant_name}
                    </Link>
                  </Td>
                  <Td>
                    <StatusBadge status={u.kyc_status === "approved_sandbox" ? "active" : "pending"} />
                  </Td>
                  <Td>
                    {u.suspended ? (
                      <Badge tone="danger"><Ban className="h-3 w-3" /> Suspended</Badge>
                    ) : (
                      <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
                    )}
                  </Td>
                  <Td className="tnum">{u.login_count}</Td>
                  <Td className="whitespace-nowrap text-text-secondary">
                    {u.last_login_at ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(u.last_login_at)}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-text-secondary">
                    {u.created_at ? formatDate(u.created_at) : "—"}
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
