// MOCK ONLY. Small helpers so the in-memory mock can produce believable new records.
// The API is the source of truth for all of this; nothing here is used outside src/api/mock.

/**
 * Settlement maths for the mock, following TRD §12 exactly:
 *   fee_usd_cents = roundHalfUp(gross_usd_cents x fee_bps, 10000)
 *   net_usd_cents = gross_usd_cents - fee_usd_cents
 *   net_npr_paisa = roundHalfUp(net_usd_cents x rate_micro, 1000000)
 *   roundHalfUp(n, d) = (2n + d) / (2d) with BigInt integer division, n >= 0.
 */
export function mockSettlementMath(grossCents: bigint, feeBps: bigint, rateMicro: bigint) {
  const roundHalfUp = (n: bigint, d: bigint) => (2n * n + d) / (2n * d);
  const fee = roundHalfUp(grossCents * feeBps, 10_000n);
  const netUsd = grossCents - fee;
  const netNpr = roundHalfUp(netUsd * rateMicro, 1_000_000n);
  return { fee, netUsd, netNpr };
}

// First AD day of each BS month in fiscal year 2083/84, taken from
// nepali-date-library@1.1.16 BStoAD. Used only to label mock documents.
const BS_MONTH_STARTS: [bs: string, ad: string][] = [
  ["2083-04", "2026-07-17"],
  ["2083-05", "2026-08-17"],
  ["2083-06", "2026-09-17"],
  ["2083-07", "2026-10-18"],
  ["2083-08", "2026-11-17"],
  ["2083-09", "2026-12-16"],
  ["2083-10", "2027-01-15"],
  ["2083-11", "2027-02-13"],
  ["2083-12", "2027-03-15"],
  ["2084-01", "2027-04-14"],
];

const DAY_MS = 86_400_000;

/** AD date (YYYY-MM-DD) to BS (YYYY-MM-DD) for FY 2083/84 only; null outside that range. */
export function mockAdToBs(adDate: string): string | null {
  const t = Date.parse(`${adDate}T00:00:00Z`);
  for (let i = 0; i < BS_MONTH_STARTS.length - 1; i++) {
    const [bs, start] = BS_MONTH_STARTS[i] as [string, string];
    const next = (BS_MONTH_STARTS[i + 1] as [string, string])[1];
    const s = Date.parse(`${start}T00:00:00Z`);
    const e = Date.parse(`${next}T00:00:00Z`);
    if (t >= s && t < e) {
      const day = Math.round((t - s) / DAY_MS) + 1;
      return `${bs}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Today's date in Asia/Kathmandu as YYYY-MM-DD. */
export function kathmanduDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(d);
}

/** ISO timestamp in Kathmandu offset (+05:45). */
export function kathmanduIso(d = new Date()): string {
  const shifted = new Date(d.getTime() + (5 * 60 + 45) * 60_000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, "+05:45");
}

/** Random URL-safe string, crypto-backed. */
export function randomToken(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Fake hex digest for mock documents (not a real hash of anything). */
export function randomHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
