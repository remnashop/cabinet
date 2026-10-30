import type { ReactNode } from "react";

import { useRipple } from "./use-ripple";

/** One choice of several: a bordered row, the picked one in the accent. aside: on the right, e.g. a price. */
export function OptionRow({
  selected,
  disabled,
  onClick,
  children,
  aside,
  round,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  aside?: ReactNode;
  round?: boolean;
}) {
  const ripple = useRipple();
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      className={`relative flex w-full items-center justify-between gap-3 ${round ? "rounded-home" : "rounded-2xl"} border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "border-primary/45 bg-primary/10" : "border-white/[0.08] bg-white/[0.03] enabled:hover:bg-white/[0.06]"
      }`}
    >
      {ripple.ripples}
      {children}
      {aside !== undefined && <span className="shrink-0 text-sm font-semibold">{aside}</span>}
    </button>
  );
}
