import type { ComponentType, ReactNode } from "react";

/** The 36px bordered glass circle of a title (a card's, the header's page icon); IconButton wears it too. */
export const HEADER_CIRCLE_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-border bg-white/[0.05]";

/**
 * The panel's IconCircle. A row's: 32px, its fill and ink from tone, e.g. a payment's status (bg-success/15
 * text-success). header: a title's 36px bordered one. glyph: the circle's content instead of an icon (a currency).
 */
export function IconCircle({
  icon: Icon,
  glyph,
  tone = "bg-white/[0.06] text-foreground",
  header = false,
  className = "",
}: {
  icon?: ComponentType<{ className?: string }>;
  glyph?: ReactNode;
  tone?: string;
  header?: boolean;
  /** layout only */
  className?: string;
}) {
  const shape = header
    ? `${HEADER_CIRCLE_CLASS} text-foreground`
    : `flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tone}`;
  return <span className={`${shape} ${className}`}>{Icon ? <Icon className="size-4" /> : glyph}</span>;
}
