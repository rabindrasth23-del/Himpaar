import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, ShieldAlert, ShieldCheck, ShieldOff, Ban, CheckCircle2 } from "lucide-react";
import { useAdminMerchant, useAdminSetKycStatus, useAdminSetSuspended } from "../../api/hooks.ts";
import { formatDate } from "../../lib/dates.ts";
import { useToast, errorMessage } from "../../components/toast.tsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  ErrorState,
  Field,
  Input,
  PageHeader,
  PageSkeleton,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "../../components/ui.tsx";

export function AdminMerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useAdminMerchant(id ?? "");
  const setKyc = useAdminSetKycStatus();
  const setSuspended = useAdminSetSuspended();
  const [suspendReason, setSuspendReason] = useState("");

  if (isLoading) return <PageSkeleton label="Loading merchant" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const { merchant: m, users, audit } = data;
  const kycApproved = m.kyc_status === "approved_sandbox";

  const handleKyc = () => {
    const status = kycApproved ? "not_submitted" : "approved_sandbox";
    setKyc.mutate(
      { id: m.id, status },
      {
        onSuccess: () => {
          toast.success(kycApproved ? "KYC revoked" : "KYC approved");
          refetch();
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  const handleSuspend = () => {
    setSuspended.mutate(
      { id: m.id, suspended: !m.suspended, reason: suspendReason },
      {
        onSuccess: () => {
          toast.success(m.suspended ? "Merchant reactivated" : "Merchant suspended");
          setSuspendReason("");
          refetch();
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={m.name}
        description={`ID: ${m.id}`}
        back={
          <button onClick={() => navigate("/admin/merchants")} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Merchants
          </button>
        }
        actions={
          <>
            <Button
              variant={kycApproved ? "danger" : "primary"}
              size="sm"
              loading={setKyc.isPending}
              onClick={handleKyc}
            >
              {kycApproved ? (
                <><ShieldOff className="h-3.5 w-3.5" /> Revoke KYC</>
              ) : (
                <><ShieldCheck className="h-3.5 w-3.5" /> Approve KYC</>
              )}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Details card */}
          <Card>
            <CardHeader title="Merchant details" />
            <DetailList
              items={[
                { label: "Company", value: m.name },
                { label: "Registration #", value: m.registration_number ?? "—" },
                { label: "PAN/VAT", value: m.pan_vat ?? "—" },
                {
                  label: "KYC",
                  value: <StatusBadge status={kycApproved ? "active" : "pending"} />,
                },
                {
                  label: "Status",
                  value: m.suspended ? (
                    <Badge tone="danger"><ShieldAlert className="h-3 w-3" /> Suspended</Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  ),
                },
                { label: "Created", value: formatDate(m.created_at) },
              ]}
            />
          </Card>

          {/* Users card */}
          <Card>
            <CardHeader title="Users" description={`${users.length} user${users.length !== 1 ? "s" : ""}`} />
            <Table label="Users" minWidth={300}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Email</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-mono text-xs">{u.id}</Td>
                    <Td>{u.email}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader title="Activity" />
            {audit.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-text-secondary">No activity recorded.</p>
            ) : (
              <div className="divide-y divide-border">
                {audit.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <p className="text-sm text-text-primary">{a.summary}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {a.actor} · {formatDate(a.at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold text-text-primary mb-3">
              {m.suspended ? "Reactivate merchant" : "Suspend merchant"}
            </h3>
            <p className="text-[13px] text-text-secondary mb-3">
              {m.suspended
                ? "This merchant is currently suspended and cannot log in. Reactivate to restore access."
                : "Suspending blocks all logins and hides the merchant from public payment pages."}
            </p>
            {!m.suspended && (
              <Field id="suspend-reason" label="Reason (optional)" className="mb-3">
                <Input
                  id="suspend-reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Compliance issue"
                />
              </Field>
            )}
            <Button
              variant={m.suspended ? "primary" : "danger"}
              size="sm"
              className="w-full"
              loading={setSuspended.isPending}
              onClick={handleSuspend}
            >
              {m.suspended ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Reactivate</>
              ) : (
                <><Ban className="h-3.5 w-3.5" /> Suspend merchant</>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
