/**
 * Developers page — API keys, webhook endpoints, delivery log, quick-start.
 */
import { useState } from "react";
import { Key, Link2, Plus, Trash2 } from "lucide-react";
import {
  useApiKeys, useCreateApiKey, useRevokeApiKey,
  useWebhookEndpoints, useCreateWebhookEndpoint,
  useDeleteWebhookEndpoint, useWebhookDeliveries,
} from "../../api/hooks.ts";
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input,
  PageHeader, PageSkeleton, SimulatedTag, StatusBadge, Table, Td, Th,
} from "../../components/ui.tsx";
import { CopyButton } from "../../components/amount.tsx";
import { useToast, errorMessage } from "../../components/toast.tsx";
import { formatDate } from "../../lib/dates.ts";
import { EVENT_LABEL } from "../../lib/labels.ts";
import { Tabs, TabPanel } from "../../components/tabs.tsx";
import { CodeTabs } from "../../components/code.tsx";

type DevTab = "keys" | "webhooks" | "deliveries" | "quickstart";

export function DevelopersPage() {
  const apiKeys = useApiKeys();
  const [tab, setTab] = useState<DevTab>("keys");

  if (apiKeys.isLoading) return <PageSkeleton label="Loading developer tools" />;
  if (apiKeys.isError) return <ErrorState error={apiKeys.error} onRetry={() => apiKeys.refetch()} />;

  const tabsId = "dev-tabs";

  return (
    <div>
      <PageHeader
        title="Developers"
        description="API keys, webhooks, and integration tools. All sandbox-only."
      />
      <Tabs
        id={tabsId}
        label="Developer sections"
        items={[
          { key: "keys" as const, label: "API keys" },
          { key: "webhooks" as const, label: "Webhooks" },
          { key: "deliveries" as const, label: "Delivery log" },
          { key: "quickstart" as const, label: "Quick start" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <TabPanel tabsId={tabsId} tabKey="keys" active={tab === "keys"}>
        <ApiKeysSection />
      </TabPanel>
      <TabPanel tabsId={tabsId} tabKey="webhooks" active={tab === "webhooks"}>
        <WebhooksSection />
      </TabPanel>
      <TabPanel tabsId={tabsId} tabKey="deliveries" active={tab === "deliveries"}>
        <DeliveriesSection />
      </TabPanel>
      <TabPanel tabsId={tabsId} tabKey="quickstart" active={tab === "quickstart"}>
        <QuickStartSection />
      </TabPanel>
    </div>
  );
}

/* ── API Keys ────────────────────────────────────────────────── */
function ApiKeysSection() {
  const keys = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const toast = useToast();
  const [name, setName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    createKey.mutate(
      { name: name.trim() },
      {
        onSuccess: (result) => {
          setCreatedSecret(result.secret);
          setName("");
          toast.success("API key created", "Copy the key now — it won't be shown again.");
        },
        onError: (e) => toast.error("Failed", errorMessage(e)),
      },
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader
        title="API keys"
        description="Create keys to authenticate API requests. Sandbox-only."
        action={<SimulatedTag />}
      />

      {/* Create key */}
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
        <Field id="new-key-name" label="Key name" className="min-w-0 flex-1">
          <Input
            id="new-key-name"
            placeholder="e.g. Development"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </Field>
        <Button onClick={handleCreate} loading={createKey.isPending} size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Create key
        </Button>
      </div>

      {/* Reveal banner */}
      {createdSecret && (
        <div className="border-b border-warning/30 bg-warning/5 px-5 py-4">
          <p className="text-sm font-medium text-warning-fg">
            Copy this key now — it won't be shown again
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md border border-warning/20 bg-white px-3 py-2 font-mono text-xs text-slate-800">
              {createdSecret}
            </code>
            <CopyButton text={createdSecret} label="Copy" />
          </div>
        </div>
      )}

      {/* Key list */}
      {(keys.data ?? []).length === 0 ? (
        <EmptyState
          title="No API keys"
          description="Create your first key above."
          icon={<Key className="h-5 w-5" aria-hidden />}
        />
      ) : (
        <Table label="API keys" minWidth={480}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Prefix</Th>
              <Th>Created</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(keys.data ?? []).map((k) => (
              <tr key={k.id} className="group/row">
                <Td className="font-medium text-text-primary">{k.name ?? "API Key"}</Td>
                <Td><code className="font-mono text-xs text-text-secondary">{k.prefix}…</code></Td>
                <Td className="whitespace-nowrap text-text-secondary">{formatDate(k.created_at)}</Td>
                <Td>{k.revoked_at ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>}</Td>
                <Td align="right">
                  {!k.revoked_at && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        revokeKey.mutate(k.id, {
                          onSuccess: () => toast.info("Revoked", `Key ${k.prefix}… revoked.`),
                          onError: (e) => toast.error("Failed", errorMessage(e)),
                        })
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

/* ── Webhooks ────────────────────────────────────────────────── */
function WebhooksSection() {
  const endpoints = useWebhookEndpoints();
  const createEp = useCreateWebhookEndpoint();
  const deleteEp = useDeleteWebhookEndpoint();
  const toast = useToast();
  const [url, setUrl] = useState("");

  const handleCreate = () => {
    if (!url.trim()) return;
    createEp.mutate(
      { url: url.trim() },
      {
        onSuccess: () => {
          setUrl("");
          toast.success("Endpoint added", "Webhooks will be sent to this URL (simulated).");
        },
        onError: (e) => toast.error("Failed", errorMessage(e)),
      },
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader
        title="Webhook endpoints"
        description="Register URLs to receive simulated event notifications."
        action={<SimulatedTag />}
      />

      <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
        <Field id="new-ep-url" label="Endpoint URL" className="min-w-0 flex-1">
          <Input
            id="new-ep-url"
            type="url"
            placeholder="https://your-app.com/webhooks/himpaar"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </Field>
        <Button onClick={handleCreate} loading={createEp.isPending} size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add endpoint
        </Button>
      </div>

      {(endpoints.data ?? []).length === 0 ? (
        <EmptyState
          title="No endpoints"
          description="Add a URL to receive simulated webhook events."
          icon={<Link2 className="h-5 w-5" aria-hidden />}
        />
      ) : (
        <Table label="Webhook endpoints" minWidth={480}>
          <thead>
            <tr>
              <Th>URL</Th>
              <Th>Created</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(endpoints.data ?? []).map((ep) => (
              <tr key={ep.id} className="group/row">
                <Td>
                  <code className="break-all font-mono text-xs text-text-primary">{ep.url}</code>
                </Td>
                <Td className="whitespace-nowrap text-text-secondary">{formatDate(ep.created_at)}</Td>
                <Td align="right">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      deleteEp.mutate(ep.id, {
                        onSuccess: () => toast.info("Deleted", "Endpoint removed."),
                        onError: (e) => toast.error("Failed", errorMessage(e)),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

/* ── Delivery log ────────────────────────────────────────────── */
function DeliveriesSection() {
  const deliveries = useWebhookDeliveries();

  if (deliveries.isLoading) return <PageSkeleton label="Loading deliveries" rows={3} />;

  return (
    <Card className="mt-4">
      <CardHeader
        title="Delivery log"
        description="Recent webhook delivery attempts (simulated)."
        action={<SimulatedTag />}
      />
      {(deliveries.data ?? []).length === 0 ? (
        <EmptyState
          title="No deliveries"
          description="Webhook deliveries appear after payments and settlements trigger events."
        />
      ) : (
        <Table label="Webhook deliveries" minWidth={560}>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Status</Th>
              <Th>Attempt</Th>
              <Th>Sent</Th>
            </tr>
          </thead>
          <tbody>
            {(deliveries.data ?? []).map((d) => (
              <tr key={d.id} className="group/row">
                <Td>
                  <span className="text-sm font-medium text-text-primary">
                    {EVENT_LABEL[d.event_type as keyof typeof EVENT_LABEL] ?? d.event_type}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <SimulatedTag />
                  </div>
                </Td>
                <Td className="tnum">{d.attempt}</Td>
                <Td className="whitespace-nowrap text-text-secondary">{formatDate(d.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

/* ── Quick start ─────────────────────────────────────────────── */
function QuickStartSection() {
  return (
    <Card className="mt-4">
      <CardHeader
        title="Quick start"
        description="Integrate Himpaar in your application (sandbox example)."
        action={<SimulatedTag />}
      />
      <div className="p-5">
        <CodeTabs
          title="Integration examples"
          snippets={[
            {
              key: "ts",
              label: "TypeScript",
              lang: "ts",
              code: `import { Himpaar } from "@himpaar/sdk";

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
);`,
            },
          ]}
        />
        <p className="mt-4 text-xs text-text-secondary">
          Sandbox only. The SDK is not yet published to npm.
        </p>
      </div>
    </Card>
  );
}
