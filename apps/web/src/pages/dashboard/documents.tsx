/**
 * Documents list — /dashboard/documents
 */
import { Link, useNavigate } from "react-router";
import { Download, FileText } from "lucide-react";
import { useDocuments } from "../../api/hooks.ts";
import { Card, EmptyState, ErrorState, PageHeader, PageSkeleton, SimulatedTag, Table, Td, Th, Tr } from "../../components/ui.tsx";
import { formatDate } from "../../lib/dates.ts";
import type { SettlementDocument } from "@himpaar/shared";

export function DocumentsPage() {
  const { data, isLoading, isError, error, refetch } = useDocuments();

  if (isLoading) return <PageSkeleton label="Loading documents" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const docs = data ?? [];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Simulated settlement advice PDFs. Not real documents."
      />
      <Card>
        {docs.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Settlement advice documents appear after a settlement is created."
            icon={<FileText className="h-8 w-8 text-text-muted" aria-hidden />}
          />
        ) : (
          <Table label="Documents">
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Settlement</Th>
                <Th>Created</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <DocumentRow key={d.id} doc={d} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function DocumentRow({ doc }: { doc: SettlementDocument }) {
  const navigate = useNavigate();
  return (
    <Tr onOpen={() => navigate(`/dashboard/documents/${doc.id}`)}>
      <Td>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <Link
            to={`/dashboard/documents/${doc.id}`}
            className="font-medium text-text-primary underline-offset-2 hover:underline"
          >
            {doc.title}
          </Link>
        </div>
      </Td>
      <Td>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
          Settlement advice <SimulatedTag />
        </span>
      </Td>
      <Td>
        {doc.settlement_id ? (
          <Link
            to={`/dashboard/settlements/${doc.settlement_id}`}
            className="font-mono text-xs text-brand-600 hover:underline"
          >
            {doc.settlement_id.slice(0, 8)}…
          </Link>
        ) : (
          "—"
        )}
      </Td>
      <Td className="whitespace-nowrap text-text-secondary">{formatDate(doc.created_at)}</Td>
      <Td align="right">
        <Link
          to={`/dashboard/documents/${doc.id}`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <Download className="h-3.5 w-3.5" aria-hidden /> View
        </Link>
      </Td>
    </Tr>
  );
}
