import { cn } from "./ui.tsx";

export function HimpaarMark({ className, title = "Himpaar" }: { className?: string; title?: string }) {
  return (
    <img
      src="/himpaar-mark.png"
      alt={title}
      className={cn("h-7 w-7 object-contain inline-block shrink-0 select-none", className)}
      loading="eager"
    />
  );
}

export function HimpaarLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HimpaarMark className="h-7 w-7 shrink-0" />
      {!collapsed && (
        <span className="font-display text-[17px] font-bold tracking-tight text-text-primary">Himpaar</span>
      )}
    </span>
  );
}
