export function SettingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your account and webhook configuration.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {/* Merchant info */}
        <section className="rounded-xl border border-border bg-surface-elevated p-6 shadow-card">
          <h2 className="text-base font-semibold text-text-primary">
            Merchant Information
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            KYC and business details. Simulated for sandbox.
          </p>
          <div className="mt-4 rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-muted italic">
              Complete KYC to unlock this section.
            </p>
          </div>
        </section>

        {/* Webhooks */}
        <section className="rounded-xl border border-border bg-surface-elevated p-6 shadow-card">
          <h2 className="text-base font-semibold text-text-primary">
            Webhook Endpoints
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Receive real-time notifications for payment events.
          </p>
          <div className="mt-4 rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-muted italic">
              No webhook endpoints configured.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
