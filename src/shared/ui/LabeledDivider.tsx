import type { ReactNode } from "react";

/** The panel's LabeledDivider: a horizontal rule with an eyebrow label in the middle ("or"). */
export function LabeledDivider({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="h-px flex-1 bg-border" />
      <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
