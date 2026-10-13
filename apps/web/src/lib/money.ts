// The ONLY money formatter in the web app. Every screen uses formatMoney.
//
// Rules (AGENTS.md §5):
// - Amounts are integer minor units (USD cents, NPR paisa).
// - They arrive as BigInt or as an integer string. JavaScript numbers are refused,
//   because a number silently loses precision above 2^53 (9,007,199,254,740,992).
// - All arithmetic here is BigInt or string work. No floating point anywhere.
import { MINOR_UNIT_DIGITS, type Currency } from "@himpaar/shared";

export type MinorUnits = bigint | string;

const INTEGER_STRING = /^-?(0|[1-9]\d*)$/;

/** Turn an integer string or BigInt into a BigInt. Throws on anything else. */
export function toMinorBigInt(amountMinor: MinorUnits): bigint {
  if (typeof amountMinor === "bigint") return amountMinor;
  if (typeof amountMinor === "string" && INTEGER_STRING.test(amountMinor)) {
    return BigInt(amountMinor);
  }
  throw new TypeError(`Invalid minor-unit amount: ${String(amountMinor)}`);
}

/** Add thousands separators to a string of digits: "1234567" -> "1,234,567". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format integer minor units for display.
 *
 *   formatMoney(100000n, "USD")        -> "USD 1,000.00"
 *   formatMoney("13290750", "NPR")     -> "NPR 132,907.50"
 *   formatMoney(-5n, "USD")            -> "-USD 0.05"
 *
 * Plain-English steps: split the absolute amount into a whole part
 * (amount / 100) and a fraction part (amount % 100), pad the fraction to
 * two digits, group the whole part in threes, and put the sign in front.
 */
export function formatMoney(amountMinor: MinorUnits, currency: Currency): string {
  const value = toMinorBigInt(amountMinor);
  const digits = MINOR_UNIT_DIGITS[currency];
  const base = 10n ** BigInt(digits);

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / base; // BigInt division truncates, which is exact for non-negative values
  const fraction = abs % base;

  const fractionText = digits > 0 ? "." + fraction.toString().padStart(digits, "0") : "";
  return `${negative ? "-" : ""}${currency} ${groupThousands(whole.toString())}${fractionText}`;
}

/**
 * Convert a typed decimal string ("1000", "1000.5", "1000.50") into minor units
 * using string arithmetic only. Returns null if the text is not a valid amount.
 */
export function parseMajorToMinor(text: string, currency: Currency): bigint | null {
  const digits = MINOR_UNIT_DIGITS[currency];
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!match) return null;
  const whole = match[1] ?? "0";
  const frac = match[2] ?? "";
  if (frac.length > digits) return null; // never round user input silently
  return BigInt(whole + frac.padEnd(digits, "0"));
}

/**
 * Format a simulated FX rate stored as NPR per USD x 1,000,000 (integer string).
 *   formatRateMicro("134250000") -> "134.25"
 * Shows at least two decimals and trims trailing zeros beyond that.
 */
export function formatRateMicro(rateMicro: MinorUnits): string {
  const value = toMinorBigInt(rateMicro);
  const whole = value / 1_000_000n;
  let frac = (value % 1_000_000n).toString().padStart(6, "0");
  while (frac.length > 2 && frac.endsWith("0")) frac = frac.slice(0, -1);
  return `${groupThousands(whole.toString())}.${frac}`;
}

/** Fee in basis points as a percentage string: 100 -> "1.00%". Integer maths only. */
export function formatBps(bps: number): string {
  const b = BigInt(bps);
  return `${b / 100n}.${(b % 100n).toString().padStart(2, "0")}%`;
}
