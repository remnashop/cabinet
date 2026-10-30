import { useState, type PointerEvent } from "react";

interface Wave {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * A ripple from where the pointer went down: spread onPointerDown on a `relative` element and render `ripples`
 * inside it. They clip to a layer of their own that takes the element's radius, so the element needs no
 * overflow-hidden (which would clip, say, a pill gliding into it). The point is kept as a share of the element, so
 * a ripple stays put in one that resizes under it (the bottom nav's tab widening to its label). CSS (animate-tap-ripple, app/styles.css); none
 * with reduced motion, none from a key.
 */
export function useRipple() {
  const [waves, setWaves] = useState<Wave[]>([]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // a circle that covers the element from whichever point it starts at
    const size = Math.hypot(rect.width, rect.height) * 2;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const wave = { id: event.timeStamp, x, y, size };
    setWaves((current) => [...current, wave]);
  };

  const ripples = (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {waves.map(({ id, x, y, size }) => (
        <span
          key={id}
          className="absolute hidden rounded-full bg-white/15 motion-safe:block motion-safe:animate-tap-ripple"
          style={{
            left: `calc(${x * 100}% - ${size / 2}px)`,
            top: `calc(${y * 100}% - ${size / 2}px)`,
            width: size,
            height: size,
          }}
          onAnimationEnd={() => setWaves((current) => current.filter((w) => w.id !== id))}
        />
      ))}
    </span>
  );

  return { onPointerDown, ripples };
}
