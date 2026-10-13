import { useState } from "react";
import type { Money } from "@himpaar/shared";
import { Check, Copy } from "lucide-react";
import { formatMoney } from "../lib/money.ts";
import { SimulatedTag, cn } from "./ui.tsx";

/** Displays money via formatMoney with tabular numerals. */
export function Amount({
  money,
  simulated = false,
  className,
}: {
  money: Money;
  simulated?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span className="font-medium tabular-nums">{formatMoney(money.amount_minor, money.currency)}</span>
      {simulated && <SimulatedTag />}
    </span>
  );
}

/** Copy text to the clipboard with a short confirmation. */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2.5 text-[13px] font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50",
        className,
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success-fg" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}
