/**
 * Documents page — list settlement advice documents.
 * Title is always "Himpaar Settlement Advice (simulated)".
 */

import {
  useDocuments,
} from "../../api/hooks.ts";
import {
  PageHeader, Card, LoadingRows, ErrorState, EmptyState, Table, Th, Td, SimulatedTag,
} from "../../components/ui.tsx";
import { formatDate } from "../../lib/dates.ts";

export function DocumentsPage() {
  const { data, isLoading, isError, error, refetch } = useDocuments();

  if (isLoading) return <LoadingRows />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const docs = data ?? [];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Simulated settlement advice documents"
      />
      <Card>
        {docs.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Documents are generated when a settlement completes."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Settlement</Th>
                <Th>Created</Th>
                <Th align="right">Label</Th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <Td>
                    <p className="text-sm font-medium text-slate-800">{d.title}</p>
                    <p className="text-xs text-slate-500 font-mono">{d.id}</p>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-slate-600">{d.settlement_id}</span>
                  </Td>
                  <Td>
                    <span className="text-slate-500">{formatDate(d.created_at)}</span>
                  </Td>
                  <Td align="right">
                    <SimulatedTag />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        SIMULATED, NOT AN OFFICIAL DOCUMENT. Footer on every generated PDF: "SIMULATED, NOT AN OFFICIAL DOCUMENT".
      </p>
    </div>
  );
}
