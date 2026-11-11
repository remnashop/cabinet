import type { ComponentType, ReactNode } from "react";

interface InfoRowProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  onClick?: () => void;
  /** the label and its icon in the foreground, not muted */
  bright?: boolean;
}

/** "icon · label · value" row for Card variant="list". */
export function InfoRow({ icon: Icon, label, value, onClick, bright }: InfoRowProps) {
  const content = (
    <>
      <span className={`flex shrink-0 items-center gap-2.5 ${bright ? "text-foreground" : "text-muted-foreground"}`}>
        {Icon && <Icon className="size-[15px]" />}
        <span className="text-sm">{label}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">{value}</span>
    </>
  );
  const base =
    "flex h-9.5 w-full items-center justify-between gap-3 rounded-full px-2.5 text-left transition-colors hover:bg-white/[0.04]";
  return onClick ? (
    <button type="button" onClick={onClick} className={base}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}
