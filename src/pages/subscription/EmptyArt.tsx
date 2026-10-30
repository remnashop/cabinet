import { BrandMark } from "@entities/appearance/BrandMark";

const RING =
  "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px), #000 calc(100% - 1px), transparent)";

export function LogoArt() {
  const orbits: [string, string, boolean][] = [
    ["size-44", "3.2s", false],
    ["size-60", "5.5s", true],
  ];
  return (
    <div className="flex flex-1 items-center justify-center py-6">
      <div className="relative flex size-64 items-center justify-center">
        <span className="absolute size-36 rounded-full bg-primary/25 blur-3xl motion-safe:animate-breathe" />
        {orbits.map(([size, duration, reverse]) => (
          <div key={size} className={`absolute ${size}`}>
            <span className="absolute inset-0 rounded-full border border-white/[0.07]" />
            <div
              // its own layer: the turn moves it, the tail isn't repainted every frame
              className="absolute inset-0 will-change-transform motion-safe:animate-spin"
              style={{ animationDuration: duration, animationDirection: reverse ? "reverse" : "normal" }}
            >
              {/* the tail: a conic sweep cut down to a 2px ring, brightest where the head is (the top); the ring's
                  edges fade over a pixel, a hard cut stepped and shimmered as it turned */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from ${reverse ? "0deg" : "-120deg"}, ${
                    reverse ? "var(--color-primary), transparent 120deg" : "transparent, var(--color-primary) 120deg, transparent 120deg"
                  })`,
                  mask: RING,
                  WebkitMask: RING,
                }}
              />
              <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-[3px] rounded-full bg-primary shadow-[0_0_10px_2px_var(--color-primary)]" />
            </div>
          </div>
        ))}
        <BrandMark className="relative size-28 text-primary" />
      </div>
    </div>
  );
}
