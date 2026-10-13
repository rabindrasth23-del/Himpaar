import { Key, Plus } from "lucide-react";

export function ApiKeysPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">API Keys</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage API keys for SDK and programmatic access.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Empty state */}
      <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Key className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">
          No API keys yet
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Create an API key to integrate with the Himpaar SDK.
        </p>
      </div>
    </>
  );
}
