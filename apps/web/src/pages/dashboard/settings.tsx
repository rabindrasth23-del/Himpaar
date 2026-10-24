/**
 * Settings page — /dashboard/settings
 * Manage company profile, KYC status, sandbox environment, and developer shortcuts.
 */
import { useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Mail,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { useSession, useApiKeys, useWebhookEndpoints } from "../../api/hooks.ts";
import { API_MODE, useApi } from "../../api/index.ts";
import { MOCK_FEE_BPS, MOCK_RATE_MICRO } from "../../api/mock/data.ts";
import { Badge, Button, Card, CardHeader, DetailList, PageHeader } from "../../components/ui.tsx";
import { useToast } from "../../components/toast.tsx";

export function SettingsPage() {
  const session = useSession();
  const apiKeys = useApiKeys();
  const webhooks = useWebhookEndpoints();
  const api = useApi();
  const toast = useToast();

  const [emailNotify, setEmailNotify] = useState(true);
  const [settlementNotify, setSettlementNotify] = useState(true);
  const [webhookNotify, setWebhookNotify] = useState(false);
  const [resetting, setResetting] = useState(false);

  const merchant = session.data?.merchant;
  const user = session.data?.user;

  const rateFloat = (Number(MOCK_RATE_MICRO) / 1_000_000).toFixed(2);
  const feePercent = (MOCK_FEE_BPS / 100).toFixed(2);

  const handleResetSandbox = () => {
    if (api.mode !== "mock") {
      toast.error("Not available", "Database reset is only supported in sandbox mock mode.");
      return;
    }
    setResetting(true);
    setTimeout(() => {
      try {
        if ("reset" in api && typeof api.reset === "function") {
          api.reset();
        } else {
          localStorage.removeItem("himpaar.mock.db_v2");
        }
        toast.success("Sandbox data reset", "All sample payments, links, and documents have been restored to defaults.");
        window.location.reload();
      } catch {
        toast.error("Reset failed", "Could not reset sandbox data.");
      } finally {
        setResetting(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your merchant profile, sandbox configuration, and developer environment."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Business Profile & Preferences */}
        <div className="space-y-6 lg:col-span-2">
          {/* Merchant Profile */}
          <Card>
            <CardHeader
              title="Merchant Profile"
              description="Your business identity registered with Himpaar (simulated for sandbox)."
              action={
                <Link to="/dashboard/kyc">
                  <Button size="sm" variant="secondary">
                    Update KYC details
                  </Button>
                </Link>
              }
            />
            <div className="p-5">
              <DetailList
                items={[
                  { label: "Company Name", value: merchant?.name ?? "—" },
                  { label: "Account ID", value: <code className="font-mono text-xs">{merchant?.id ?? "—"}</code> },
                  { label: "Work Email", value: user?.email ?? "—" },
                  {
                    label: "Registration No.",
                    value: merchant?.registration_number ? (
                      <span className="font-mono">{merchant.registration_number}</span>
                    ) : (
                      <span className="text-text-muted italic">Not registered</span>
                    ),
                  },
                  {
                    label: "PAN / VAT",
                    value: merchant?.pan_vat ? (
                      <span className="font-mono">{merchant.pan_vat}</span>
                    ) : (
                      <span className="text-text-muted italic">Not provided</span>
                    ),
                  },
                  {
                    label: "KYC Status",
                    value:
                      merchant?.kyc_status === "approved_sandbox" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Badge tone="success">
                            <ShieldCheck className="mr-1 h-3 w-3 inline" />
                            Approved (sandbox)
                          </Badge>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <Badge tone="warning">
                            <ShieldAlert className="mr-1 h-3 w-3 inline" />
                            Not Submitted
                          </Badge>
                          <Link to="/dashboard/kyc" className="text-xs text-brand-700 hover:underline">
                            Complete KYC →
                          </Link>
                        </div>
                      ),
                  },
                ]}
              />
            </div>
          </Card>

          {/* Simulated Notifications */}
          <Card>
            <CardHeader
              title="Notification Preferences"
              description="Configure alerts for payment activity and settlement documents."
            />
            <div className="divide-y divide-border p-5">
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">Payment receipts</p>
                  </div>
                  <p className="text-xs text-text-secondary">Send email notifications whenever an invoice or payment link is settled.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailNotify(!emailNotify);
                    toast.success("Preferences updated", "Email receipt preferences saved.");
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    emailNotify ? "bg-brand-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={emailNotify}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      emailNotify ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">Settlement documents</p>
                  </div>
                  <p className="text-xs text-text-secondary">Notify when official Settlement Advice (BS/AD) is generated.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettlementNotify(!settlementNotify);
                    toast.success("Preferences updated", "Settlement notification preferences saved.");
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    settlementNotify ? "bg-brand-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={settlementNotify}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settlementNotify ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">Webhook failure alerts</p>
                  </div>
                  <p className="text-xs text-text-secondary">Alert developer email when an endpoint exhausts retry attempts.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWebhookNotify(!webhookNotify);
                    toast.success("Preferences updated", "Webhook alert preferences saved.");
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    webhookNotify ? "bg-brand-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={webhookNotify}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      webhookNotify ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1 col): Developer & Sandbox Environment */}
        <div className="space-y-6">
          {/* Developer Quick Status */}
          <Card>
            <CardHeader
              title="API & Integrations"
              description="Access keys and webhooks for automated workflows."
            />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50/75 p-3">
                <div className="flex items-center gap-2.5">
                  <Code2 className="h-4 w-4 text-brand-600" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">API Keys</p>
                    <p className="text-[11px] text-text-secondary">{apiKeys.data?.length ?? 0} active keys</p>
                  </div>
                </div>
                <Link
                  to="/dashboard/developers"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                >
                  Manage <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50/75 p-3">
                <div className="flex items-center gap-2.5">
                  <Webhook className="h-4 w-4 text-brand-600" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Webhook Endpoints</p>
                    <p className="text-[11px] text-text-secondary">{webhooks.data?.length ?? 0} endpoints configured</p>
                  </div>
                </div>
                <Link
                  to="/dashboard/developers"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                >
                  Manage <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>

          {/* Sandbox Environment Settings */}
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader
              title="Sandbox Environment"
              description="Settings governing this simulated testing environment."
            />
            <div className="space-y-3.5 p-5 text-xs text-text-secondary">
              <div className="flex justify-between border-b border-warning/20 pb-2">
                <span>Active Mode:</span>
                <span className="font-semibold text-warning-fg uppercase">TEST / SANDBOX</span>
              </div>
              <div className="flex justify-between border-b border-warning/20 pb-2">
                <span>API Connection:</span>
                <span className="font-mono text-text-primary">{API_MODE === "real" ? "Real Backend" : "In-Browser Mock"}</span>
              </div>
              <div className="flex justify-between border-b border-warning/20 pb-2">
                <span>Simulated FX Rate:</span>
                <span className="font-mono font-medium text-text-primary">1 USD = {rateFloat} NPR</span>
              </div>
              <div className="flex justify-between border-b border-warning/20 pb-2">
                <span>Simulated Fee:</span>
                <span className="font-mono font-medium text-text-primary">{feePercent}%</span>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-danger-fg hover:bg-danger/10 border-danger/30"
                  onClick={handleResetSandbox}
                  loading={resetting}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset sandbox data
                </Button>
                <p className="mt-1.5 text-center text-[11px] text-text-muted">
                  Wipes custom sample records and restores initial mock seed.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
