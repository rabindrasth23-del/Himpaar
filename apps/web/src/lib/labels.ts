// Human-readable labels for enum values shown in the UI.
import type { PaymentMethod, WebhookEventType } from "@himpaar/shared";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  ach: "ACH bank transfer",
  sepa: "SEPA transfer",
  swift: "SWIFT wire",
};

export const METHOD_SHORT: Record<PaymentMethod, string> = {
  card: "Card",
  ach: "ACH",
  sepa: "SEPA",
  swift: "SWIFT",
};

export const EVENT_LABEL: Record<WebhookEventType, string> = {
  "payment.succeeded": "Payment succeeded",
  "payment.failed": "Payment failed",
  "settlement.settled": "Settlement settled",
  "document.created": "Document created",
};

const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

/** "US" -> "United States". Falls back to the code. */
export function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Absolute URL for a payment link path such as "/pay/abc". */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** The "/pay/:token" path for a link, whatever form the API returned. */
export function payPath(token: string): string {
  return `/pay/${encodeURIComponent(token)}`;
}
