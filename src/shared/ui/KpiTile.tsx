import type { ReactNode } from "react";

import { CountUp } from "@shared/ui/CountUp";

/** The panel's KpiTile: an eyebrow over a big counted-up number; action sits beside the eyebrow. */
export function KpiTile({
  label,
  value,
  tone,
  action,
}: {
  label: string;
  value: string;
  tone?: "primary";
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-[18px] py-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        {action}
      </div>
      <div className={`text-[26px] font-bold tabular-nums tracking-tight ${tone === "primary" ? "text-primary" : ""}`}>
        <CountUp text={value} />
      </div>
    </div>
  );
}
