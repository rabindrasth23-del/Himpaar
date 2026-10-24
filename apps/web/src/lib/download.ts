// File downloads for settlement documents.
import type { SettlementDocument } from "@himpaar/shared";
import { API_URL } from "../api/index.ts";

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** PDF is rendered by the API (GET /v1/documents/:id/pdf, session cookie). */
export async function downloadDocumentPdf(docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/documents/${encodeURIComponent(docId)}/pdf`, { credentials: "include" });
  if (!res.ok) throw new Error(`PDF download failed (HTTP ${res.status})`);
  saveBlob(await res.blob(), `himpaar-settlement-advice-${docId}-simulated.pdf`);
}

/** JSON is the document record exactly as the API returned it. */
export function downloadDocumentJson(doc: SettlementDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2) + "\n"], { type: "application/json" });
  saveBlob(blob, `himpaar-settlement-advice-${doc.id}-simulated.json`);
}

/** Plain-text download (for simulated settlement advice). */
export function downloadPlainText(text: string, filename: string): void {
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

