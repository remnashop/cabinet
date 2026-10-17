import type { ComponentType, ReactNode } from "react";

interface InfoRowProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  onClick?: () => void;
}

/** "icon · label · value" row for Card variant="list". */
export function InfoRow({ icon: Icon, label, value, onClick }: InfoRowProps) {
  const content = (
    <>
      <span className="flex shrink-0 items-center gap-2.5 text-muted-foreground">
        {Icon && <Icon className="size-[15px]" />}
        <span className="text-[12.5px]">{label}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground">{value}</span>
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
