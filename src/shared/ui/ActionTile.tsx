import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useSurface } from "./surface";
import { useRipple } from "./use-ripple";

/**
 * A square-ish action: its icon in a circle over the label, or a figure in its place (value). to: a route, else a
 * button. main: the one to take, in the accent. As tall as a KpiTile (16.5px eyebrow line + 6px + 39px value line + py-4 + 2px border), so the rows
 * match.
 */
export function ActionTile({
  to,
  icon: Icon,
  value,
  label,
  desktopLabel,
  main,
  disabled,
  round,
  className = "",
  onClick,
}: {
  to?: string;
  icon?: LucideIcon;
  /** a figure over the label instead of the icon: the profile's balance */
  value?: ReactNode;
  label: string;
  /** a longer label for the desktop's wider tile; a phone keeps `label` */
  desktopLabel?: string;
  main?: boolean;
  disabled?: boolean;
  round?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const ripple = useRipple();
  const { shape, fill } = useSurface(round);
  const classes = `relative flex min-h-[95.5px] flex-col items-center justify-center gap-1.5 ${shape} px-2 py-4 text-center text-sm font-medium leading-tight transition-colors disabled:pointer-events-none disabled:opacity-50 ${
    main ? "border border-primary/45 bg-primary/10 hover:bg-primary/15" : `${fill} hover:bg-white/[0.06]`
  } ${className}`;
  const content = (
    <>
      {ripple.ripples}
      {value !== undefined ? (
        // the icon circle's 34px line: a figure tile stands as tall as an icon one
        <span className="flex h-[34px] items-center text-2xl font-bold tabular-nums tracking-tight">{value}</span>
      ) : (
        Icon && (
          <span
            className={`flex size-[34px] items-center justify-center rounded-full ${
              main ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
            }`}
          >
            <Icon className="size-4" />
          </span>
        )
      )}
      {desktopLabel ? (
        <>
          <span className="lg:hidden">{label}</span>
          <span className="max-lg:hidden">{desktopLabel}</span>
        </>
      ) : (
        label
      )}
    </>
  );
  return to ? (
    <Link to={to} onClick={onClick} onPointerDown={ripple.onPointerDown} className={classes}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      className={classes}
    >
      {content}
    </button>
  );
}
