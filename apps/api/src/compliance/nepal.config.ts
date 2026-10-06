/**
 * Nepal compliance constants.
 *
 * Every value here is simulated and unverified. Each constant is prefixed
 * UNVERIFIED_ and includes a comment saying who must confirm it before
 * any real use. Any UI or document displaying these values must show
 * "Simulated / unverified".
 */

// --- Fee ---
// Who must confirm: accountant, bank partner, NRB
// The actual fee will depend on the bank agreement.
export const UNVERIFIED_DEMO_FEE_BPS = 100n; // 1% (100 basis points), labeled simulated

// --- FX rate ---
// Who must confirm: NRB published rate, bank partner
// This is a placeholder. Real rates come from NRB and change daily.
// Stored as NPR per USD × 1,000,000 (integer, no floats).
export const UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO = 134_250_000n; // ~134.25 NPR/USD, labeled simulated

// --- Tax ---
// Who must confirm: accountant, IRD
export const UNVERIFIED_TDS_RATE_BPS = 0n; // TDS on foreign remittance — unknown, placeholder zero

// --- Document ---
// Who must confirm: bank partner, lawyer
export const UNVERIFIED_DOCUMENT_TITLE = "Himpaar Settlement Advice (simulated)";
export const UNVERIFIED_DOCUMENT_FOOTER = "SIMULATED, NOT AN OFFICIAL DOCUMENT";

// --- Country rules interface ---
// Only Nepal is implemented. Keep this minimal for the MVP.
export interface CountryRules {
  country: string; // "NP"
  currencyPair: { from: string; to: string }; // { from: "USD", to: "NPR" }
  documentTemplate: string; // template identifier
  fiscalYearLabel(date: Date): string; // e.g. "2083/84"
}
