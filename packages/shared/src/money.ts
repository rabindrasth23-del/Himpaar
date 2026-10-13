// Money on the wire.
// Amounts are integer minor units (USD cents, NPR paisa). JSON has no BigInt,
// so amounts travel as base-10 integer strings ("13290750"), never as numbers.
// A JavaScript number loses precision above 2^53, which is why strings are used.
import { z } from "zod";

export const CurrencySchema = z.enum(["USD", "NPR"]);
export type Currency = z.infer<typeof CurrencySchema>;

/** Integer minor units as a string. Optional leading minus, digits only, no decimals. */
export const MinorUnitsSchema = z
  .string()
  .regex(/^-?(0|[1-9]\d*)$/, "Amount must be an integer number of minor units");

export const MoneySchema = z.object({
  amount_minor: MinorUnitsSchema,
  currency: CurrencySchema,
});
export type Money = z.infer<typeof MoneySchema>;

/** Number of minor units per major unit. Both supported currencies use 2 decimals. */
export const MINOR_UNIT_DIGITS: Record<Currency, number> = {
  USD: 2,
  NPR: 2,
};
