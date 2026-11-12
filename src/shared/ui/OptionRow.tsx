import type { ReactNode } from "react";

import { useSurface } from "./surface";
import { Ripple } from "./Ripple";

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
  const { shape, fill } = useSurface(round);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex w-full items-center justify-between gap-3 ${shape} px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "border border-primary/45 bg-primary/10" : `${fill} enabled:hover:bg-white/[0.06]`
      }`}
    >
      <Ripple />
      {children}
      {aside !== undefined && <span className="shrink-0 text-sm font-semibold">{aside}</span>}
    </button>
  );
}
