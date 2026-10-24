// Code snippets with tabs, light syntax highlighting and a copy button.
// The highlighter is a ~30-line tokenizer (comments, strings, numbers, keywords,
// calls, object keys). It is enough for short examples and needs no dependency.
import { useId, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Tabs, TabPanel } from "./tabs.tsx";
import { cn } from "./ui.tsx";

export type CodeLang = "ts" | "bash" | "json";

const KEYWORDS = new Set([
  "import", "from", "export", "const", "let", "await", "async", "function", "return", "new",
  "if", "else", "try", "catch", "throw", "true", "false", "null", "undefined", "typeof",
]);

const TOKEN =
  /(?<com>\/\/[^\n]*|(?:^|(?<=\s))#[^\n]*)|(?<str>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?<num>\b\d[\d_]*(?:\.\d+)?\b)|(?<word>[A-Za-z_$][\w$]*)(?<call>\s*\()?|(?<other>[\s\S])/gm;

export function highlight(code: string, lang: CodeLang): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = "";
  let i = 0;
  const flush = () => {
    if (plain) out.push(plain);
    plain = "";
  };
  const push = (cls: string, text: string) => {
    flush();
    out.push(
      <span key={i++} className={cls}>
        {text}
      </span>,
    );
  };

  for (const m of code.matchAll(TOKEN)) {
    const g = m.groups ?? {};
    if (g.com && (lang === "bash" ? g.com.startsWith("#") : g.com.startsWith("//"))) push("tok-com", g.com);
    else if (g.com) plain += g.com;
    else if (g.str) {
      // A JSON key is a string followed by a colon.
      const after = code.slice((m.index ?? 0) + g.str.length).trimStart();
      push(lang === "json" && after.startsWith(":") ? "tok-prop" : "tok-str", g.str);
    } else if (g.num) push("tok-num", g.num);
    else if (g.word) {
      const after = code.slice((m.index ?? 0) + g.word.length + (g.call?.length ?? 0));
      if (lang !== "json" && KEYWORDS.has(g.word)) push("tok-key", g.word);
      else if (g.call) push("tok-fn", g.word);
      else if (lang === "ts" && /^\s*:/.test(after)) push("tok-prop", g.word);
      else plain += g.word;
      if (g.call) plain += g.call;
    } else plain += g.other ?? "";
  }
  flush();
  return out;
}

export function CopyCodeButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
        className,
      )}
      aria-label={copied ? "Copied to clipboard" : "Copy code"}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export interface Snippet {
  key: string;
  label: string;
  lang: CodeLang;
  code: string;
}

export function CodeTabs({ snippets, title, className }: { snippets: Snippet[]; title?: string; className?: string }) {
  const id = useId();
  const [active, setActive] = useState(snippets[0]?.key ?? "");
  const current = snippets.find((s) => s.key === active) ?? snippets[0];

  return (
    <div className={cn("overflow-hidden rounded-lg border border-navy-800 bg-navy-950 shadow-md", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          {title && <span className="hidden text-xs font-medium text-slate-300 sm:inline">{title}</span>}
          <Tabs
            id={id}
            label={title ?? "Code examples"}
            variant="pill"
            items={snippets.map((s) => ({ key: s.key, label: s.label }))}
            value={active}
            onChange={setActive}
          />
        </div>
        {current && <CopyCodeButton text={current.code} />}
      </div>
      {snippets.map((s) => (
        <TabPanel key={s.key} tabsId={id} tabKey={s.key} active={s.key === active}>
          <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6 text-slate-100" tabIndex={0}>
            <code>{highlight(s.code, s.lang)}</code>
          </pre>
        </TabPanel>
      ))}
    </div>
  );
}
