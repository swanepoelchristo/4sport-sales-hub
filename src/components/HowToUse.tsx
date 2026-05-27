import { useState, type ReactNode } from "react";

export function HowToUse({
  title = "How to use this page",
  adminOnly = false,
  children,
  defaultOpen = false,
}: {
  title?: string;
  adminOnly?: boolean;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden>💡</span>
          <span>{title}</span>
          {adminOnly && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Admin
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:text-foreground">
          {children}
        </div>
      )}
    </div>
  );
}
