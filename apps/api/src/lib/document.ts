/**
 * Settlement document (TRD §11): canonical JSON, API DTO, and PDF rendering.
 *
 * The JSON is the source of truth; its SHA-256 is stored on the Document row.
 * The PDF is rendered on demand from that JSON, so it can never drift from it.
 */
import PDFDocument from "pdfkit";
import { UNVERIFIED_DOCUMENT_FOOTER, UNVERIFIED_DOCUMENT_TITLE } from "../compliance/nepal.config.js";
import { fiscalYearLabel, toBsDate } from "./nepal-date.js";

export interface DocumentJson {
  title: string;
  footer: string;
  merchant_name: string;
  merchant_pan_vat: string | null;
  payer_name: string;
  payer_country: string;
  invoice_reference: string;
  gross_usd: string; // USD cents
  fee_usd: string; // USD cents
  fee_bps: number;
  net_usd: string; // USD cents
  rate_micro: string;
  rate_label: "simulated";
  net_npr: string; // NPR paisa
  created_at: string; // AD, ISO 8601
  created_at_bs: string; // BS, YYYY-MM-DD
  fiscal_year_label: string;
}

export function buildDocumentJson(input: {
  merchantName: string;
  merchantPanVat: string | null;
  invoiceReference: string;
  grossUsdCents: bigint;
  feeUsdCents: bigint;
  feeBps: bigint;
  rateMicro: bigint;
  netNprPaisa: bigint;
  at: Date;
}): DocumentJson {
  return {
    title: UNVERIFIED_DOCUMENT_TITLE,
    footer: UNVERIFIED_DOCUMENT_FOOTER,
    merchant_name: input.merchantName,
    merchant_pan_vat: input.merchantPanVat,
    payer_name: "Simulated Payer",
    payer_country: "US",
    invoice_reference: input.invoiceReference,
    gross_usd: input.grossUsdCents.toString(),
    fee_usd: input.feeUsdCents.toString(),
    fee_bps: Number(input.feeBps),
    net_usd: (input.grossUsdCents - input.feeUsdCents).toString(),
    rate_micro: input.rateMicro.toString(),
    rate_label: "simulated",
    net_npr: input.netNprPaisa.toString(),
    created_at: input.at.toISOString(),
    created_at_bs: toBsDate(input.at),
    fiscal_year_label: fiscalYearLabel(input.at),
  };
}

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

/** Read stored JSON, tolerating rows written before the current field names. */
export function readDocumentJson(raw: unknown, createdAt: Date): DocumentJson {
  const j = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    title: UNVERIFIED_DOCUMENT_TITLE,
    footer: UNVERIFIED_DOCUMENT_FOOTER,
    merchant_name: str(j.merchant_name, ""),
    merchant_pan_vat: typeof j.merchant_pan_vat === "string" ? j.merchant_pan_vat : null,
    payer_name: str(j.payer_name, "Simulated Payer"),
    payer_country: str(j.payer_country, "US"),
    invoice_reference: str(j.invoice_reference, str(j.reference, "")),
    gross_usd: str(j.gross_usd, "0"),
    fee_usd: str(j.fee_usd, "0"),
    fee_bps: typeof j.fee_bps === "number" ? j.fee_bps : 0,
    net_usd: str(j.net_usd, "0"),
    rate_micro: str(j.rate_micro, "0"),
    rate_label: "simulated",
    net_npr: str(j.net_npr, "0"),
    created_at: str(j.created_at, str(j.settled_at, createdAt.toISOString())),
    created_at_bs: str(j.created_at_bs, toBsDate(createdAt)),
    fiscal_year_label: str(j.fiscal_year_label, fiscalYearLabel(createdAt)),
  };
}

/** API response shape — matches DocumentSchema in @himpaar/shared. */
export function toDocumentDto(doc: { id: string; settlementId: string; json: unknown; sha256: string; createdAt: Date }) {
  const j = readDocumentJson(doc.json, doc.createdAt);
  return {
    id: doc.id,
    settlement_id: doc.settlementId,
    title: j.title,
    status: "generated" as const,
    merchant_name: j.merchant_name,
    merchant_pan_vat: j.merchant_pan_vat,
    payer_name: j.payer_name,
    payer_country: j.payer_country,
    invoice_reference: j.invoice_reference,
    gross: { amount_minor: j.gross_usd, currency: "USD" as const },
    fee: { amount_minor: j.fee_usd, currency: "USD" as const },
    rate_micro: j.rate_micro,
    rate_label: j.rate_label,
    net_npr: { amount_minor: j.net_npr, currency: "NPR" as const },
    created_at: j.created_at,
    created_at_bs: j.created_at_bs,
    fiscal_year_label: j.fiscal_year_label,
    sha256: doc.sha256,
  };
}

/** Format integer minor units ("123456") as "1,234.56" using string arithmetic only. */
export function formatMinor(minor: string): string {
  const neg = minor.startsWith("-");
  const digits = (neg ? minor.slice(1) : minor).padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${whole}.${digits.slice(-2)}`;
}

/** Format rate_micro ("134250000") as "134.250000". */
function formatRate(micro: string): string {
  const d = micro.padStart(7, "0");
  return `${d.slice(0, -6)}.${d.slice(-6)}`;
}

/** Render the settlement advice PDF. Footer appears on every page. */
export function renderDocumentPdf(id: string, sha256: string, j: DocumentJson): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 56, bufferPages: true, info: { Title: j.title } });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.font("Helvetica-Bold").fontSize(18).text(j.title);
    pdf.moveDown(0.3).font("Helvetica").fontSize(9).fillColor("#666").text(`Document ID: ${id}`);
    pdf.moveDown(1.2).fillColor("#000");

    const row = (label: string, value: string) => {
      const y = pdf.y;
      pdf.font("Helvetica").fontSize(10).fillColor("#555").text(label, 56, y, { width: 200 });
      pdf.font("Helvetica-Bold").fillColor("#000").text(value, 260, y, { width: 280 });
      pdf.moveDown(0.5);
    };
    const section = (title: string) => {
      pdf.moveDown(0.6).font("Helvetica-Bold").fontSize(11).fillColor("#000").text(title, 56);
      pdf.moveDown(0.4);
    };

    section("Parties");
    row("Merchant", j.merchant_name);
    row("PAN/VAT (as entered, unverified)", j.merchant_pan_vat ?? "Not provided");
    row("Payer", `${j.payer_name} (${j.payer_country})`);
    row("Invoice reference", j.invoice_reference);

    section("Amounts");
    row("Gross", `USD ${formatMinor(j.gross_usd)}`);
    row(`Fee (${j.fee_bps} bps, simulated)`, `USD ${formatMinor(j.fee_usd)}`);
    row("Net", `USD ${formatMinor(j.net_usd)}`);
    row("FX rate (simulated)", `${formatRate(j.rate_micro)} NPR per USD`);
    row("Net settled", `NPR ${formatMinor(j.net_npr)}`);

    section("Dates");
    row("Date (AD)", j.created_at);
    row("Date (BS)", j.created_at_bs);
    row("Nepali fiscal year", j.fiscal_year_label);

    section("Integrity");
    pdf.font("Courier").fontSize(8).fillColor("#333").text(`SHA-256 of JSON: ${sha256}`, 56);

    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      const bottom = pdf.page.height - 40;
      pdf.page.margins.bottom = 0; // allow writing in the margin without adding a page
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#b00020")
        .text(j.footer, 56, bottom, { width: pdf.page.width - 112, align: "center", lineBreak: false });
    }
    pdf.end();
  });
}
