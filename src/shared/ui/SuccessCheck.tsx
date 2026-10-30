import type { ReactNode } from "react";

/**
 * The success screen's mark: the green disc pops in and its check draws itself, the connect guide's done step in
 * small (animate-pop, animate-draw in app/styles.css); with reduced motion the still disc and check.
 */
export function SuccessCheck() {
  return (
    <span className="flex size-20 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success motion-safe:animate-pop">
      <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
        {/* pathLength 1: the dash animation draws it whatever the path's real length */}
        <path
          d="M20 6 9 17l-5-5"
          pathLength={1}
          strokeDasharray={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="motion-safe:animate-draw"
        />
      </svg>
    </span>
  );
}

/**
 * A bare sheet's done state: the mark over what happened, in general; the hint under it says what exactly changed. The
 * way on (a full-width button, mt-6) is the caller's.
 */
export function SuccessMessage({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 text-center">
      <SuccessCheck />
      <div className="flex flex-col gap-1.5">
        <p className="text-lg font-bold text-foreground">{children}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
