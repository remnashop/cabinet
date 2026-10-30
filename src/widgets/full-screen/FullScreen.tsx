import type { ReactNode } from "react";

import { AlertMark } from "@shared/ui/AlertMark";

/** Centered column for screens outside the shell: splash, sign-in, errors. */
export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[var(--tg-viewport-stable-height,100dvh)] items-center justify-center px-4 pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">{children}</div>
    </div>
  );
}

/** A screen that only says something: its title, a line under it, the way on below. tone: an error's or a warning's
 *  mark over the title (AlertMark). */
export function FullScreenMessage({
  tone,
  title,
  text,
  children,
}: {
  tone?: "error" | "warning";
  title: string;
  text?: string | null;
  children?: ReactNode;
}) {
  return (
    <FullScreen>
      {tone && <AlertMark tone={tone} />}
      <h1 className="text-lg font-bold">{title}</h1>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      {children}
    </FullScreen>
  );
}
