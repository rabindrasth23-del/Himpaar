// Himpaar mark. Simple geometric placeholder drawn from brand/source/himpaar-mark.png:
// two slanted pillars split by a rising crossbar. Replace with the final brand SVG when ready.
// (brand/himpaar-mark.svg exists but is an unfinished trace that does not match the source.)
import { cn } from "./ui.tsx";

export function HimpaarMark({ className, title = "Himpaar" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 336 378"
      className={cn("h-7 w-7", className)}
      role="img"
      aria-label={title}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinejoin="round"
    >
      {/* upper-left pillar */}
      <path d="M7 50 L99 10 L99 162 L7 212 Z" />
      {/* upper-right pillar */}
      <path d="M232 50 L329 10 L329 92 L232 122 Z" />
      {/* lower-left pillar joined to the rising crossbar */}
      <path d="M7 370 L99 338 L99 252 L329 184 L329 116 L110 180 Q30 204 7 262 Z" />
      {/* lower-right pillar */}
      <path d="M232 234 L329 200 L329 336 L232 370 Z" />
    </svg>
  );
}

export function HimpaarLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HimpaarMark className="h-7 w-7 shrink-0 text-brand-600" />
      {!collapsed && (
        <span className="font-display text-[17px] font-bold tracking-tight text-text-primary">Himpaar</span>
      )}
    </span>
  );
}
