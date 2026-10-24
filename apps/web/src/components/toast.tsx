// Toasts: short confirmations and errors after an action.
// No dependency. Announced through an aria-live region so screen readers hear them.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./ui.tsx";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string | undefined;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON = {
  success: <CheckCircle2 className="h-4 w-4 text-success-fg" aria-hidden />,
  error: <AlertTriangle className="h-4 w-4 text-danger-fg" aria-hidden />,
  info: <Info className="h-4 w-4 text-info-fg" aria-hidden />,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setItems((all) => [...all.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface-elevated px-4 py-3 shadow-lg",
              t.tone === "error" ? "border-danger/30" : "border-border",
            )}
          >
            <span className="mt-0.5 shrink-0">{TONE_ICON[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-text-secondary">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-mr-1 rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-text-primary"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Readable message from any thrown value (API errors carry a message). */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Try again.";
}
