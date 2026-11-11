import type { ReactNode } from "react";

import { CountUp } from "@shared/ui/CountUp";
import { useSurface } from "@shared/ui/surface";

/** The panel's KpiTile: an eyebrow over a big counted-up number; action sits beside the eyebrow, hint under it. */
export function KpiTile({
  label,
  value,
  tone,
  action,
  hint,
  valueSuffix,
  round,
}: {
  label: string;
  value: string;
  tone?: "primary";
  action?: ReactNode;
  hint?: ReactNode;
  /** small, after the value: e.g. the struck-out price before a discount, as the panel's */
  valueSuffix?: ReactNode;
  round?: boolean;
}) {
  const { shape, fill } = useSurface(round);
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${shape} ${fill} px-[18px] py-4`}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        {action}
      </div>
      <div className={`text-2xl font-bold tabular-nums tracking-tight ${tone === "primary" ? "text-primary" : ""}`}>
        <CountUp text={value} />
        {valueSuffix && <span className="ml-2 text-sm font-medium text-muted-foreground">{valueSuffix}</span>}
      </div>
      {hint && <div className="-mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
