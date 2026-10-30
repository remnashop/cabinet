import type { ComponentType, ReactNode } from "react";

import { useRipple } from "./use-ripple";

export const EVENT_ROW = "h-15 rounded-full px-3 transition-colors";

/** The panel's event log: rows split by hairlines and staggered in (list-rows, app/styles.css). Dividers are an
 *  inset shadow, not divide-y: a border would add 1px to every row but the last. */
export function EventList({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`list-rows flex flex-col [&>*:not(:last-child)]:shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--color-border)_50%,transparent)] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The round icon at the start of a row; or a glyph in its place, e.g. a payment's currency, as the panel's. tone: the
 * circle's fill and ink, e.g. a payment's status (bg-success/15 text-success).
 */
export function EventIcon({
  icon: Icon,
  glyph,
  tone = "bg-white/[0.06] text-foreground",
}: {
  icon?: ComponentType<{ className?: string }>;
  glyph?: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${tone}`}>
      {Icon ? <Icon className="size-4" /> : glyph}
    </span>
  );
}

export function EventRow({
  icon,
  title,
  caption,
  aside,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  aside?: ReactNode;
  onClick?: () => void;
}) {
  const ripple = useRipple();
  const content = (
    <>
      {onClick && ripple.ripples}
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-foreground/90">{title}</span>
        {caption && <span className="truncate text-[12px] text-muted-foreground">{caption}</span>}
      </span>
      {aside && <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold">{aside}</span>}
    </>
  );
  const className = `relative flex w-full items-center gap-3 text-left ${EVENT_ROW}`;
  // group: the aside can answer the row's hover (a device's trash)
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      className={`group ${className} hover:bg-white/[0.04]`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function EventListEmpty({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
      <Icon className="size-5" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
