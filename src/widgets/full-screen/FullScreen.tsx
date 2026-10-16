import type { ReactNode } from "react";

/** Centered column for screens outside the shell: splash, sign-in, errors. */
export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[var(--tg-viewport-stable-height,100dvh)] items-center justify-center px-4 pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">{children}</div>
    </div>
  );
}
