import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Centered column for screens outside the shell: splash, sign-in, errors. */
export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[var(--tg-viewport-stable-height,100dvh)] items-center justify-center px-4 pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">{children}</div>
    </div>
  );
}

/** A screen that only says something: its title, a line under it, the way on below. icon: an error's mark over the
 *  title, muted as PageEmpty's (TriangleAlert). */
export function FullScreenMessage({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string | null;
  children?: ReactNode;
}) {
  return (
    <FullScreen>
      {Icon && <Icon className="size-8 text-muted-foreground" aria-hidden />}
      <h1 className="text-lg font-bold">{title}</h1>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      {children}
    </FullScreen>
  );
}
