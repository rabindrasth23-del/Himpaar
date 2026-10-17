/**
 * Developers page — API keys, webhook endpoints, delivery log, quick-start.
 * Ported from Downloads copy, adapted to use real repo's HimpaarApi hooks.
 */

import { useState } from "react";
import {
  useApiKeys, useCreateApiKey, useRevokeApiKey,
  useWebhookEndpoints, useCreateWebhookEndpoint,
  useDeleteWebhookEndpoint, useWebhookDeliveries,
} from "../../api/hooks.ts";
import {
  PageHeader, Card, Button, Input,
  StatusBadge, Badge, LoadingRows,
} from "../../components/ui.tsx";
import { formatDate } from "../../lib/dates.ts";

export function DevelopersPage() {
  const apiKeys = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const webhookEps = useWebhookEndpoints();
  const createEp = useCreateWebhookEndpoint();
  const deleteEp = useDeleteWebhookEndpoint();
  const deliveries = useWebhookDeliveries();

  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    createKey.mutate({ name: newKeyName }, {
      onSuccess: (result) => {
        setCreatedKey(result.secret);
        setNewKeyName("");
      },
    });
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateEndpoint = () => {
    if (!newWebhookUrl.trim()) return;
    createEp.mutate({ url: newWebhookUrl }, {
      onSuccess: () => setNewWebhookUrl(""),
    });
  };

  if (apiKeys.isLoading) return <LoadingRows />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developers"
        description="API keys, webhooks, and integration"
      />

      {/* API Keys */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">API Keys</h2>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Key name (e.g. Development)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleCreateKey} disabled={createKey.isPending} size="sm">
            Create key
          </Button>
        </div>

        {createdKey && (
          <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm font-medium text-warning-fg mb-2">
              Copy this key now — it won't be shown again:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white rounded border border-warning/20 text-sm font-mono text-slate-800 break-all">
                {createdKey}
              </code>
              <Button variant="secondary" size="sm" onClick={handleCopyKey}>
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {(apiKeys.data ?? []).map((key) => (
            <div key={key.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{key.name ?? "API Key"}</p>
                <p className="text-xs font-mono text-slate-500">{key.prefix}…</p>
              </div>
              <div className="flex items-center gap-3">
                {key.revoked_at ? (
                  <Badge tone="danger">Revoked</Badge>
                ) : (
                  <>
                    <Badge tone="success">Active</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeKey.mutate(key.id)}
                    >
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhook Endpoints */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Webhook Endpoints</h2>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="https://your-app.com/webhooks/himpaar"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={handleCreateEndpoint} disabled={createEp.isPending} size="sm">
            Add endpoint
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {(webhookEps.data ?? []).map((ep) => (
            <div key={ep.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-mono text-slate-800">{ep.url}</p>
                <p className="text-xs text-slate-500">{formatDate(ep.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteEp.mutate(ep.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhook Deliveries */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Webhook Deliveries</h2>
        <div className="divide-y divide-slate-100">
          {(deliveries.data ?? []).map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={d.status} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.event_type}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(d.created_at)} · Attempt {d.attempt}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {(deliveries.data ?? []).length === 0 && (
            <p className="text-sm text-slate-500 py-4">No deliveries yet.</p>
          )}
        </div>
      </Card>

      {/* Quick Start */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Start</h2>
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-slate-100 font-mono whitespace-pre">{`import { Himpaar } from "@himpaar/sdk";

const himpaar = new Himpaar("hp_test_...");

// Create a payment link
const link = await himpaar.paymentLinks.create({
  amount: 100000,         // USD cents ($1,000.00)
  currency: "USD",
  description: "Website development",
  clientName: "Acme Corp",
  clientEmail: "billing@acme.com",
  expiresAt: "2026-12-01",
});

console.log(link.url); // /pay/<token>

// Verify a webhook
const event = himpaar.webhooks.verify(
  rawBody,
  headers
);`}</pre>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Sandbox only. The SDK is not yet published to npm.
        </p>
      </Card>
    </div>
  );
}
