import type { ComponentType, ReactNode } from "react";

/** A row of EventList: a pill, 60px tall. */
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

/** The round icon at the start of a row. */
export function EventIcon({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-foreground">
      <Icon className="size-4" />
    </span>
  );
}

/** An empty list: its icon over a line of text. */
export function EventListEmpty({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
      <Icon className="size-5" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
