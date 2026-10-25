import { useAdminAudit } from "../../api/hooks.ts";
import { formatDate } from "../../lib/dates.ts";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  type Tone,
} from "../../components/ui.tsx";

const ACTION_TONE: Record<string, Tone> = {
  "admin.login": "info",
  "user.signup": "success",
  "user.login": "neutral",
  "user.login_failed": "warning",
  "user.login_blocked": "danger",
  "user.kyc_submitted": "info",
  "user.link_created": "success",
  "kyc.approved": "success",
  "kyc.revoked": "warning",
  "merchant.suspended": "danger",
  "merchant.reactivated": "success",
  "settlement.paid_out": "success",
};

export function AdminAuditPage() {
  const { data, isLoading, isError, error, refetch } = useAdminAudit();

  if (isLoading) return <PageSkeleton label="Loading activity log" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const entries = data ?? [];

  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Full audit trail — admin actions and user activity in chronological order."
      />
      <Card>
        {entries.length === 0 ? (
          <EmptyState title="No activity yet" description="Actions will be logged here." />
        ) : (
          <div className="divide-y divide-border">
            {entries.map((a) => (
              <div key={a.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <Badge tone={ACTION_TONE[a.action] ?? "neutral"} className="shrink-0 self-start">
                  {a.action.replace(/\./g, " · ")}
                </Badge>
                <p className="min-w-0 flex-1 text-sm text-text-primary">{a.summary}</p>
                <div className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
                  <span>{a.actor}</span>
                  <span className="whitespace-nowrap">{formatDate(a.at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
