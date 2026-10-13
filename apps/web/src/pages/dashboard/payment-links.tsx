import { Link2, Plus } from "lucide-react";

export function PaymentLinksPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Payment Links
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create and manage payment links for your customers.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          <Plus className="h-4 w-4" />
          Create Link
        </button>
      </div>

      {/* Empty state */}
      <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Link2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">
          No payment links yet
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Create your first payment link to get started.
        </p>
      </div>
    </>
  );
}
