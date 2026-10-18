/**
 * Documents page — list settlement advice documents with PDF download.
 * Title is always "Himpaar Settlement Advice (simulated)".
 */

import { useState } from "react";
import {
  useDocuments,
} from "../../api/hooks.ts";
import { API_URL } from "../../api/index.ts";
import {
  PageHeader, Card, LoadingRows, ErrorState, EmptyState, Table, Th, Td, SimulatedTag,
} from "../../components/ui.tsx";
import { formatDate } from "../../lib/dates.ts";

/** Download a document PDF via credentialed fetch → blob → anchor click. */
async function downloadPdf(docId: string) {
  const res = await fetch(`${API_URL}/v1/documents/${encodeURIComponent(docId)}/pdf`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`PDF download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `settlement-advice-${docId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DocumentsPage() {
  const { data, isLoading, isError, error, refetch } = useDocuments();
  const [downloading, setDownloading] = useState<string | null>(null);

  if (isLoading) return <LoadingRows />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const docs = data ?? [];

  const handleDownload = async (docId: string) => {
    setDownloading(docId);
    try {
      await downloadPdf(docId);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setDownloading(null);
    }
  };

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
                <Th align="right">Actions</Th>
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
                    <div className="flex items-center gap-2 justify-end">
                      <SimulatedTag />
                      <button
                        id={`download-pdf-${d.id}`}
                        type="button"
                        disabled={downloading === d.id}
                        onClick={() => handleDownload(d.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {downloading === d.id ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Downloading…
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            PDF
                          </>
                        )}
                      </button>
                    </div>
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
