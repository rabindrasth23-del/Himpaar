/**
 * Document detail — /dashboard/documents/:id
 * Shows the settlement advice fields and a simulated PDF download.
 */
import { Link, useParams } from "react-router";
import { ArrowLeft, Download, FileText, Printer, ShieldCheck } from "lucide-react";
import { useDocument } from "../../api/hooks.ts";
import { Button, Card, DetailList, ErrorState, PageHeader, PageSkeleton, SimulatedTag } from "../../components/ui.tsx";
import { Amount } from "../../components/amount.tsx";
import { formatDate, formatBs } from "../../lib/dates.ts";
import { formatMoney } from "../../lib/money.ts";
import { useToast } from "../../components/toast.tsx";
import { downloadPlainText } from "../../lib/download.ts";
import { countryName } from "../../lib/labels.ts";
import { HimpaarMark } from "../../components/brand.tsx";

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading, isError, error, refetch } = useDocument(id ?? "");
  const toast = useToast();

  if (isLoading) return <PageSkeleton label="Loading document" rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!doc) return <ErrorState error={new Error("Not found")} />;

  const handleDownload = () => {
    // Build a plain-text representation of the settlement advice.
    const lines = [
      doc.title,
      "",
      "SIMULATED – NOT A REAL DOCUMENT",
      "========================================",
      "",
      `Merchant:            ${doc.merchant_name}`,
      `PAN/VAT:             ${doc.merchant_pan_vat ?? "—"}`,
      `Payer:               ${doc.payer_name}`,
      `Payer country:       ${countryName(doc.payer_country)}`,
      `Invoice ref:         ${doc.invoice_reference}`,
      "",
      `Gross:               ${formatMoney(doc.gross.amount_minor, doc.gross.currency)}`,
      `Fee:                 ${formatMoney(doc.fee.amount_minor, doc.fee.currency)}`,
      `FX rate:             ${doc.rate_micro} (${doc.rate_label})`,
      `Net (NPR):           ${formatMoney(doc.net_npr.amount_minor, doc.net_npr.currency)}`,
      "",
      `Created (AD):        ${formatDate(doc.created_at)}`,
      `Created (BS):        ${formatBs(doc.created_at_bs)}`,
      `Fiscal year:         ${doc.fiscal_year_label}`,
      "",
      `SHA-256:             ${doc.sha256}`,
      "",
      "========================================",
      "SIMULATED – NOT A REAL DOCUMENT",
    ];
    downloadPlainText(lines.join("\n"), `settlement-advice-${doc.id.slice(0, 8)}.txt`);
    toast.info("Downloaded", "Settlement advice saved as text file (simulated).");
  };

  return (
    <div>
      <PageHeader
        title={doc.title}
        description="Simulated settlement advice — not a real document."
        back={
          <Link to="/dashboard/documents" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Documents
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden /> Print / PDF
            </Button>
            <Button variant="secondary" onClick={handleDownload}>
              <Download className="h-4 w-4" aria-hidden /> Download TXT
            </Button>
          </div>
        }
      />

      {/* Simulated banner */}
      <div className="mb-6 rounded-lg border border-warning/25 bg-warning/5 px-4 py-3 text-sm">
        <p className="font-medium text-warning-fg">Simulated document</p>
        <p className="mt-0.5 text-text-secondary">
          This is a simulated settlement advice for demo purposes. It is not a real document.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" aria-hidden />
              <h2 className="text-sm font-semibold text-text-primary">Parties</h2>
            </div>
          </div>
          <DetailList
            items={[
              { label: "Merchant", value: doc.merchant_name },
              { label: "PAN/VAT", value: doc.merchant_pan_vat ?? "—" },
              { label: "Payer", value: doc.payer_name },
              { label: "Payer country", value: countryName(doc.payer_country) },
              { label: "Invoice ref", value: doc.invoice_reference },
            ]}
          />
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Amount breakdown</h2>
          </div>
          <DetailList
            items={[
              { label: "Gross", value: <Amount money={doc.gross} simulated /> },
              { label: "Fee", value: <Amount money={doc.fee} simulated /> },
              { label: "FX rate", value: <span className="inline-flex items-center gap-1.5 tnum">{doc.rate_micro} <SimulatedTag /></span> },
              { label: "Net (NPR)", value: <Amount money={doc.net_npr} simulated className="font-semibold" /> },
            ]}
          />
        </Card>
      </div>

      <Card className="mt-6">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Dates & verification</h2>
        </div>
        <DetailList
          items={[
            { label: "Created (AD)", value: formatDate(doc.created_at) },
            { label: "Created (BS)", value: formatBs(doc.created_at_bs) },
            { label: "Fiscal year", value: doc.fiscal_year_label },
            { label: "SHA-256", value: <code className="break-all font-mono text-xs text-text-secondary">{doc.sha256}</code> },
          ]}
        />
      </Card>

      {/* Visual Settlement Advice Certificate (Printable layout) */}
      <div className="mt-6 rounded-2xl border border-slate-300 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <HimpaarMark className="h-8 w-8" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">{doc.title}</h3>
              <p className="text-[11px] font-semibold text-rose-600">
                SIMULATED PREVIEW • NOT A BANK CERTIFICATE
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-slate-700">{doc.id.slice(0, 12)}</span>
            <div className="mt-0.5 text-[10px] text-slate-400">Fiscal Year: {doc.fiscal_year_label}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
          <div>
            <span className="text-slate-400">Bikram Sambat (BS) Date:</span>
            <div className="font-semibold text-slate-800">{formatBs(doc.created_at_bs)}</div>
          </div>
          <div>
            <span className="text-slate-400">Gregorian (AD) Date:</span>
            <div className="font-semibold text-slate-800">{formatDate(doc.created_at)}</div>
          </div>
          <div>
            <span className="text-slate-400">Beneficiary Exporter:</span>
            <div className="font-semibold text-slate-800">{doc.merchant_name}</div>
            <div className="text-[10px] text-slate-500">PAN/VAT: {doc.merchant_pan_vat ?? "—"}</div>
          </div>
          <div>
            <span className="text-slate-400">Foreign Payer:</span>
            <div className="font-semibold text-slate-800">{doc.payer_name} ({countryName(doc.payer_country)})</div>
            <div className="text-[10px] text-slate-500">Ref: {doc.invoice_reference}</div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Gross Inward Remittance:</span>
            <span className="font-mono font-semibold text-slate-900">{formatMoney(doc.gross.amount_minor, doc.gross.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Platform Service Fee (1.00%):</span>
            <span className="font-mono text-slate-700">-{formatMoney(doc.fee.amount_minor, doc.fee.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Exchange Rate Applied:</span>
            <span className="font-mono text-slate-700">{doc.rate_micro} ({doc.rate_label})</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
            <span className="font-bold text-slate-900">Total Net NPR Deposited to Holding:</span>
            <span className="font-display text-xl font-bold text-emerald-600 tabular-nums">
              {formatMoney(doc.net_npr.amount_minor, doc.net_npr.currency)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            SHA-256 Ledger Digest: <code className="font-mono text-[10px] text-slate-700">{doc.sha256.slice(0, 24)}…</code>
          </span>
          <span className="font-semibold text-emerald-700">Status: Settled (Simulated)</span>
        </div>
      </div>

      {/* Settlement link */}
      <Card className="mt-6 p-5">
        <h3 className="text-sm font-semibold text-text-primary">Related settlement</h3>
        <Link
          to={`/dashboard/settlements/${doc.settlement_id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          View settlement {doc.settlement_id.slice(0, 8)}…
        </Link>
      </Card>
    </div>
  );
}
