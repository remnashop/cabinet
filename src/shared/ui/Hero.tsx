import type { ReactNode } from "react";

/**
 * A full-screen step, as UltimaVPN's: the title and hint on top, the art in the middle, the actions at the bottom.
 * On a phone it fills the screen between the header (72px) and main's bottom padding (96px), and its pb-4 adds to
 * main's 16px gap: the buttons stand 32px over the nav. On desktop the art keeps its own height and the whole step sits
 * in the middle of the frame (150px: its margin and border, the header, main's padding), as the other full-screen
 * messages; the home's empty state still fills it, its art growing.
 */
export function Hero({
  title,
  hint,
  art,
  above,
  lower = false,
  children,
}: {
  title: string;
  hint: string;
  art: ReactNode;
  /** over the buttons, out of the flow: the art stays centred where every other step has it */
  above?: ReactNode;
  /** the title a little further down: the home's empty state */
  lower?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(var(--tg-viewport-stable-height,100dvh)-168px-var(--safe-top)-var(--safe-bottom))] flex-col items-center gap-6 pb-4 text-center lg:min-h-[calc(100dvh-150px)] lg:flex-1 lg:justify-center lg:pb-0">
      <div className={`flex flex-col gap-2 ${lower ? "pt-10" : "pt-6"}`}>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mx-auto max-w-64 text-sm text-muted-foreground">{hint}</p>
      </div>
      {art}
      <div className="relative flex w-full flex-col gap-2 sm:max-w-sm">
        {above && <div className="absolute inset-x-0 bottom-full mb-3">{above}</div>}
        {children}
      </div>
    </div>
  );
}
