import { useEffect, useRef, useState } from "react";

// a press on a control inside the host (a row's button, a link) is that control's, not the host's
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, label, [tabindex]";

interface Wave {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * The panel's Ripple: a tap wave for its positioned parent, for an element that isn't a Button (a nav pill, a row
 * link). It listens on the parent itself, so dropping it in is the whole wiring; same look as useRipple.
 */
export function Ripple() {
  const layerRef = useRef<HTMLSpanElement>(null);
  const [waves, setWaves] = useState<Wave[]>([]);

  useEffect(() => {
    const host = layerRef.current?.parentElement;
    if (!host) return;
    const onPointerDown = (event: PointerEvent) => {
      const control = (event.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      if (control && control !== host && host.contains(control)) return;
      const rect = host.getBoundingClientRect();
      // a circle that covers the element from whichever point it starts at
      const size = Math.hypot(rect.width, rect.height) * 2;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      setWaves((current) => [...current, { id: event.timeStamp, x, y, size }]);
    };
    host.addEventListener("pointerdown", onPointerDown);
    return () => host.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <span ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
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
          onAnimationEnd={() => setWaves((current) => current.filter((wave) => wave.id !== id))}
        />
      ))}
    </span>
  );
}
