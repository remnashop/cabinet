import type { LucideIcon } from "lucide-react";

/**
 * A connect step's centre: its icon in a glowing disc, rings breathing around it and fading downwards (Magic UI's
 * Ripple). CSS loops (app/styles.css), motion-safe: so reduced motion leaves the still picture.
 */
export function HeroArt({ icon: Icon }: { icon: LucideIcon }) {
  // the disc is the first ring: it breathes with them and the wave runs out from it
  const ring = (i: number) => ({ transform: "translate(-50%, -50%)", animationDelay: `${i * 0.06}s` });
  return (
    <div className="flex flex-1 items-center justify-center py-6 lg:flex-none">
      <div className="relative flex size-60 items-center justify-center">
        {/* as wide as the outer ring, so the mask fades the rings without cutting them; fits a 358px phone column, scaled down on a narrower one */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[352px] -translate-1/2 max-[360px]:scale-[0.85] mask-[linear-gradient(to_bottom,white,transparent)] select-none">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 rounded-full border border-primary bg-primary/25 shadow-xl motion-safe:animate-ripple"
              // centred by transform, not translate-*: the ripple keyframes scale that same transform
              style={{ ...ring(i), width: 112 + i * 40, height: 112 + i * 40, opacity: 0.27 - i * 0.03 }}
            />
          ))}
        </div>
        <span className="absolute size-32 rounded-full bg-primary/25 blur-2xl motion-safe:animate-breathe" />
        <span
          className="absolute top-1/2 left-1/2 size-28 rounded-full border border-primary/30 bg-primary/15 motion-safe:animate-ripple"
          style={ring(0)}
        />
        {/* over the disc, not in it: the disc breathes, the icon stays still */}
        <Icon className="relative size-12 text-primary" strokeWidth={1.75} />
      </div>
    </div>
  );
}

export function SuccessArt() {
  return (
    <div className="flex flex-1 items-center justify-center py-6 lg:flex-none">
      <div className="relative flex size-60 items-center justify-center">
        <span className="absolute size-28 rounded-full bg-success/25 blur-2xl motion-safe:animate-breathe" />
        {[0, -1.2].map((delay) => (
          <span
            key={delay}
            className="absolute hidden size-24 rounded-full border border-success/50 motion-safe:block motion-safe:animate-ripple-out"
            style={{ animationDelay: `${0.6 + delay}s` }}
          />
        ))}
        <span className="relative flex size-24 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success motion-safe:animate-pop">
          <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth={2.25}>
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
      </div>
    </div>
  );
}
