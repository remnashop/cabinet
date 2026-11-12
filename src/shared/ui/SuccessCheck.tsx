import type { CSSProperties, ReactNode } from "react";

/**
 * The success screen's mark, as tall as the lg button under it: the green disc pops in with sparks flying out and its
 * check draws itself (animate-pop, animate-spark, animate-draw in app/styles.css); with reduced motion the still disc.
 */
export function SuccessCheck() {
  return (
    <span className="relative flex size-16 items-center justify-center">
      <Sparks />
      <span className="relative flex size-16 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success motion-safe:animate-pop">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
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
    </span>
  );
}

/** Ten sparks flying out from under a success disc as it pops in, success and primary in turn; none with reduced motion. */
function Sparks() {
  return (
    <span className="pointer-events-none absolute inset-0 hidden motion-safe:block" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`absolute top-1/2 left-1/2 -ml-0.5 w-1 rounded-[2px] motion-safe:animate-spark ${
            i % 2 ? "-mt-[3px] h-1.5 bg-primary" : "-mt-[5px] h-2.5 bg-success"
          }`}
          style={{ "--a": `${i * 36}deg` } as CSSProperties}
        />
      ))}
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
        <p className="text-xl font-bold tracking-tight text-foreground">{children}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
