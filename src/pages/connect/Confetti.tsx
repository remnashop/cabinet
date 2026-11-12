import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// the theme's own colours (app/styles.css), read at run time: a canvas can't take a class
const COLOURS = ["primary", "primary-hover", "accent-foreground", "success", "warning", "error", "foreground"];
const PER_SIDE = 70;
const GRAVITY = 0.32;
const DRAG = 0.985;
// paper falls no faster than this, px per 60fps frame: it floats down rather than drops
const MAX_FALL = 2.8;
const LIFE_MS = 5000;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  angle: number;
  spin: number;
  // the paper's flutter: its height swings with cos(tilt)
  tilt: number;
  tiltSpeed: number;
  colour: string;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Telegram's confetti: two volleys from the bottom corners up towards the middle, the paper then tumbling down
 * and fading. One shot on mount, over the whole screen (portalled: inside the app frame `fixed` is the frame's).
 */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const style = getComputedStyle(document.documentElement);
    const colours = COLOURS.map((name) => style.getPropertyValue(`--color-${name}`).trim()).filter(Boolean);
    // a volley's speed scales with the screen, so it peaks around the upper third on a phone and a desktop alike
    const power = Math.sqrt(height) * 1.2;
    const pieces: Piece[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < PER_SIDE; i++) {
        // from the corner, up and inwards: 55–80° above the horizon
        const angle = (between(55, 80) * Math.PI) / 180;
        const speed = power * between(0.55, 1);
        pieces.push({
          x: side < 0 ? 0 : width,
          y: height,
          vx: -side * Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          w: between(6, 10),
          h: between(10, 16),
          angle: between(0, Math.PI * 2),
          spin: between(-0.2, 0.2),
          tilt: between(0, Math.PI * 2),
          tiltSpeed: between(0.08, 0.2),
          colour: colours[i % colours.length]!,
        });
      }
    }

    const start = performance.now();
    let last = start;
    let frame = 0;
    const draw = (now: number) => {
      // in 60fps frames, so a 120Hz screen doesn't play it twice as fast
      const step = Math.min((now - last) / (1000 / 60), 3);
      last = now;
      const left = 1 - (now - start) / LIFE_MS;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.min(1, Math.max(0, left / 0.3));
      for (const p of pieces) {
        p.vx *= DRAG ** step;
        p.vy = Math.min(p.vy * DRAG ** step + GRAVITY * step, MAX_FALL);
        // the flutter sways it sideways as it falls
        p.x += (p.vx + Math.sin(p.tilt) * 0.8) * step;
        p.y += p.vy * step;
        p.angle += p.spin * step;
        p.tilt += p.tiltSpeed * step;
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.angle);
        context.scale(1, Math.cos(p.tilt));
        context.fillStyle = p.colour;
        context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        context.restore();
      }
      if (left > 0) frame = requestAnimationFrame(draw);
      else setDone(true);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (done) return null;
  return createPortal(
    <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 size-full" />,
    document.body,
  );
}
