import type { ReactNode } from "react";

/** A choice in a wizard step: label on the left, price on the right. */
export function OptionRow({
  selected,
  disabled,
  onClick,
  children,
  aside,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "border-primary bg-primary/[0.08]" : "border-border bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <span className="min-w-0">{children}</span>
      <span className="shrink-0 text-sm font-semibold">{aside}</span>
    </button>
  );
}
