const TONE = {
  error: { disc: "border-error/40 bg-error/15 text-error motion-safe:animate-pop-shake", path: "M18 6 6 18M6 6l12 12", stroke: 2.25 },
  // "!" is two short strokes: thicker, or it reads thinner than the cross
  warning: { disc: "border-warning/40 bg-warning/15 text-warning motion-safe:animate-pop-wiggle", path: "M12 4.5v10M12 19.5h.01", stroke: 3 },
} as const;

/**
 * The success mark's counterpart, as tall as the lg button too: the disc pops in and its mark draws itself, then an
 * error's shakes and a warning's wiggles (app/styles.css); with reduced motion the still disc. Error: something failed;
 * warning: nothing broke, but there's no way on from here.
 */
export function AlertMark({ tone }: { tone: keyof typeof TONE }) {
  const { disc, path, stroke } = TONE[tone];
  return (
    <span className={`flex size-16 shrink-0 items-center justify-center rounded-full border ${disc}`}>
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={stroke}>
        {/* pathLength 1: the dash animation draws it whatever the path's real length */}
        <path
          d={path}
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
