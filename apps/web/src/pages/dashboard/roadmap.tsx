/**
 * Roadmap — static page. Items marked "not built".
 * Per AGENTS.md section 3: do not build, static page only.
 */

import { PageHeader, Card, Badge } from "../../components/ui.tsx";

const ROADMAP_ITEMS = [
  {
    title: "Real card, ACH, SEPA and SWIFT payments",
    description: "Connect to payment processors for real cross-border payments.",
  },
  {
    title: "USD settlement option",
    description: "Allow merchants to keep funds in USD in addition to NPR.",
  },
  {
    title: "Annual tax statements",
    description: "Generate annual summaries for tax filing with BS/AD dates.",
  },
  {
    title: "Tax filing assistance",
    description: "Help merchants prepare export-related tax documents.",
  },
  {
    title: "Invoice financing",
    description: "Advance payments on outstanding invoices.",
  },
  {
    title: "Other countries",
    description: "Expand beyond Nepal to other markets.",
  },
];

export function RoadmapPage() {
  return (
    <div>
      <PageHeader
        title="Roadmap"
        description="Planned features — none of these are built yet"
      />

      <div className="space-y-3">
        {ROADMAP_ITEMS.map((item) => (
          <Card key={item.title}>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-slate-400 text-sm">→</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                  <Badge tone="neutral">Not built</Badge>
                </div>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        These features are planned but not built. This is a sandbox preview only.
      </p>
    </div>
  );
}
