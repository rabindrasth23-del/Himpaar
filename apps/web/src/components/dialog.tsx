// Modal dialog built on the native <dialog> element.
// showModal() gives a real focus trap, Esc to close and an inert background.
// Focus goes back to whatever opened the dialog when it closes.
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./ui.tsx";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      if (opener.current instanceof HTMLElement) opener.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="hp-dialog m-auto"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div
          className={cn(
            "animate-scale-in mx-4 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg",
            size === "sm" && "sm:w-[420px]",
            size === "md" && "sm:w-[520px]",
            size === "lg" && "sm:w-[640px]",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-base font-semibold text-text-primary">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-[13px] text-text-secondary">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1.5 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-text-primary"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/60 px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
