import { Landmark } from "lucide-react";

export function SettlementsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Settlements
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track NPR settlements to your bank account.
        </p>
      </div>

      {/* Empty state */}
      <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Landmark className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">
          No settlements yet
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Settlements are created automatically when payments succeed.
        </p>
      </div>
    </>
  );
}
