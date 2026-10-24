// Accessible tabs (WAI-ARIA tabs pattern): arrow keys, Home and End move between tabs.
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./ui.tsx";

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  count?: number;
}

export function Tabs<K extends string>({
  id,
  items,
  value,
  onChange,
  label,
  variant = "underline",
  className,
}: {
  /** Share this with the matching TabPanels. */
  id?: string;
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  variant?: "underline" | "pill";
  className?: string;
}) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    const item = items[next];
    if (next < 0 || !item) return;
    e.preventDefault();
    onChange(item.key);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        variant === "underline"
          ? "flex gap-1 overflow-x-auto border-b border-border"
          : "inline-flex gap-1 rounded-lg bg-white/5 p-1",
        className,
      )}
    >
      {items.map((item, i) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(baseId, item.key)}
            aria-selected={selected}
            aria-controls={panelId(baseId, item.key)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap transition-colors duration-150",
              variant === "underline" &&
                cn(
                  "-mb-px border-b-2 px-3 py-2.5",
                  selected
                    ? "border-brand-600 text-text-primary"
                    : "border-transparent text-text-secondary hover:border-slate-300 hover:text-text-primary",
                ),
              variant === "pill" &&
                cn(
                  "rounded-md px-2.5 py-1 text-[13px]",
                  selected ? "bg-white/12 text-white" : "text-slate-300 hover:text-white",
                ),
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "tnum rounded-full px-1.5 text-[11px] leading-[18px]",
                  selected ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  tabsId,
  tabKey,
  active,
  children,
  className,
}: {
  tabsId: string;
  tabKey: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={panelId(tabsId, tabKey)} aria-labelledby={tabId(tabsId, tabKey)} className={className}>
      {children}
    </div>
  );
}

const tabId = (base: string, key: string) => `${base}-tab-${key}`;
const panelId = (base: string, key: string) => `${base}-panel-${key}`;
