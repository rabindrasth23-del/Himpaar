import { describe, expect, it } from "vitest";
import { DocumentSchema } from "@himpaar/shared";
import { buildDocumentJson, formatMinor, readDocumentJson, renderDocumentPdf, toDocumentDto } from "../src/lib/document.js";
import { fiscalYearLabel, toBsDate } from "../src/lib/nepal-date.js";

describe("nepal-date", () => {
  it("converts AD to BS on the Nepal wall clock", () => {
    expect(toBsDate(new Date("2026-10-18T06:00:00Z"))).toBe("2083-07-01");
    // 2026-07-16 20:00Z is already 2026-07-17 01:45 in Nepal
    expect(toBsDate(new Date("2026-07-16T20:00:00Z"))).toBe(toBsDate(new Date("2026-07-17T06:00:00Z")));
  });

  it("labels fiscal years starting Shrawan 1", () => {
    expect(fiscalYearLabel(new Date("2026-07-16T06:00:00Z"))).toBe("2082/83"); // Ashadh 32
    expect(fiscalYearLabel(new Date("2026-07-18T06:00:00Z"))).toBe("2083/84"); // Shrawan 2
    expect(fiscalYearLabel(new Date("2027-01-15T06:00:00Z"))).toBe("2083/84");
  });
});

describe("formatMinor", () => {
  it("formats minor units with string arithmetic", () => {
    expect(formatMinor("0")).toBe("0.00");
    expect(formatMinor("5")).toBe("0.05");
    expect(formatMinor("123456789")).toBe("1,234,567.89");
    expect(formatMinor("-1050")).toBe("-10.50");
  });
});

describe("settlement document", () => {
  const json = buildDocumentJson({
    merchantName: "Everest Studio",
    merchantPanVat: "123456789",
    invoiceReference: "PL-ABCDEF12",
    grossUsdCents: 100_000n,
    feeUsdCents: 1_000n,
    feeBps: 100n,
    rateMicro: 134_250_000n,
    netNprPaisa: 13_290_750n,
    at: new Date("2026-10-18T06:00:00Z"),
  });

  it("DTO satisfies the shared DocumentSchema", () => {
    const dto = toDocumentDto({ id: "doc_1", settlementId: "set_1", json, sha256: "a".repeat(64), createdAt: new Date() });
    const parsed = DocumentSchema.parse(dto);
    expect(parsed.fiscal_year_label).toBe("2083/84");
    expect(parsed.created_at_bs).toBe("2083-07-01");
    expect(parsed.net_npr.amount_minor).toBe("13290750");
  });

  it("reads legacy rows that used `reference` and `settled_at`", () => {
    const legacy = { reference: "PL-OLD", settled_at: "2026-10-01T00:00:00.000Z", gross_usd: "500" };
    const j = readDocumentJson(legacy, new Date("2026-10-01T00:00:00Z"));
    expect(j.invoice_reference).toBe("PL-OLD");
    expect(j.created_at).toBe("2026-10-01T00:00:00.000Z");
    expect(DocumentSchema.safeParse(
      toDocumentDto({ id: "d", settlementId: "s", json: legacy, sha256: "b".repeat(64), createdAt: new Date() }),
    ).success).toBe(true);
  });

  it("renders a single-page PDF", async () => {
    const pdf = await renderDocumentPdf("doc_1", "a".repeat(64), json);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBe(1);
  });
});
