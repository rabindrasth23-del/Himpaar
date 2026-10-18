/**
 * Bikram Sambat (BS) helpers for settlement documents (TRD §11).
 * Dates are taken on the Nepal wall clock (UTC+5:45), not the server's timezone.
 */
import { NepaliDate } from "nepali-date-library";

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
/** nepali-date-library months are 0-based; Shrawan (index 3) starts the Nepali fiscal year. */
const SHRAWAN = 3;

function toNepalWallClock(ad: Date): NepaliDate {
  const shifted = new Date(ad.getTime() + NEPAL_OFFSET_MS);
  // Build a local Date whose Y/M/D equal the Nepal calendar day, independent of server TZ.
  const local = new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12);
  return new NepaliDate(local);
}

/** BS date as YYYY-MM-DD. */
export function toBsDate(ad: Date): string {
  return toNepalWallClock(ad).format("YYYY-MM-DD");
}

/** Nepali fiscal year label, e.g. "2083/84" (runs Shrawan 1 to Ashadh end). */
export function fiscalYearLabel(ad: Date): string {
  const bs = toNepalWallClock(ad);
  const start = bs.getMonth() >= SHRAWAN ? bs.getYear() : bs.getYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}
