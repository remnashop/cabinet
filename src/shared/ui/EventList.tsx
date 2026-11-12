import type { ComponentType, ReactNode } from "react";

import { Ripple } from "./Ripple";

// the panel's list row: a 32px circle 14px in, on the 60px pill's curve; a title or caption too long for a phone beside
// its button wraps and the row grows, as the panel Row's description does
export const EVENT_ROW = "min-h-15 rounded-full px-3.5 py-2 transition-colors";

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

export function EventRow({
  icon,
  title,
  caption,
  meta,
  wrap = false,
  aside,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  /** a third line under the caption (a time) */
  meta?: ReactNode;
  /** the caption wraps to three lines instead of one, for a text that must be read whole (a notification) */
  wrap?: boolean;
  aside?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      {onClick && <Ripple />}
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{title}</span>
        {caption && <span className={`${wrap ? "line-clamp-3" : "line-clamp-2"} text-xs text-muted-foreground [overflow-wrap:anywhere]`}>{caption}</span>}
        {meta && <span className="truncate text-xs text-muted-foreground/70">{meta}</span>}
      </span>
      {aside && <span className="flex shrink-0 items-center gap-1.5 self-center text-sm font-semibold">{aside}</span>}
    </>
  );
  // a wrapped row grows with its text, the icon at the top, as the panel's announcements in its bell
  const shape = wrap ? "min-h-15 items-start rounded-3xl px-3.5 py-3 transition-colors" : `items-center ${EVENT_ROW}`;
  const className = `relative flex w-full gap-3 text-left ${shape}`;
  // group: the aside can answer the row's hover (a device's trash)
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
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
