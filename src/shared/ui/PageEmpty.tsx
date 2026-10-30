import type { ComponentType, ReactNode } from "react";

/** A page with nothing to list: its icon over a line of text (the way on below it), in the middle of the
 *  screen under the header (the frame's on desktop). */
export function PageEmpty({
  icon: Icon,
  text,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(var(--tg-viewport-stable-height,100dvh)-168px-var(--safe-top)-var(--safe-bottom))] flex-col items-center justify-center gap-3 text-center text-muted-foreground lg:min-h-[calc(100dvh-148px)]">
      <Icon className="size-8" />
      <p className="text-sm">{text}</p>
      {children}
    </div>
  );
}
