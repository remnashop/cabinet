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
 * The panel's Ripple, the cabinet's only one: a tap wave for its positioned parent, from where the pointer went down.
 * It listens on the parent itself, so dropping it in is the whole wiring. Clips to its own layer with the parent's
 * radius, so the parent needs no overflow-hidden; after the content, it lays over a positioned child (a card).
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
    <span ref={layerRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
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
