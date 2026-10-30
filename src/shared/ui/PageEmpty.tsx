import type { ComponentType, ReactNode } from "react";

import { AlertMark } from "@shared/ui/AlertMark";

/** A page with nothing to list: its icon over a line of text (the way on below it), in the middle of the
 *  screen under the header (the frame's on desktop). warning: a dead end (nothing found) instead, AlertMark's. */
export function PageEmpty({
  icon: Icon,
  warning,
  text,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  warning?: boolean;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(var(--tg-viewport-stable-height,100dvh)-168px-var(--safe-top)-var(--safe-bottom))] flex-col items-center justify-center gap-3 text-center text-muted-foreground lg:min-h-[calc(100dvh-148px)]">
      {warning ? <AlertMark tone="warning" /> : Icon && <Icon className="size-8" />}
      <p className="text-sm">{text}</p>
      {children}
    </div>
  );
}
