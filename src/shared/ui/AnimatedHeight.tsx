import { motion } from "motion/react";
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

const DURATION_S = 0.2;
const UNCLIP_MARGIN_MS = 50;
// sizes arriving this close together are another animation inside (a spoiler): follow it, don't ease on top
const STREAM_GAP_MS = 40;

interface AnimatedHeightProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "style"> {
  /** the box that eases: its look (shape, fill) */
  className?: string;
  /** the measured content: its padding and layout */
  innerClassName?: string;
  children: ReactNode;
}

/** The panel's AnimatedHeight: eases its own height to whatever the content measures. Clips only while moving: a
 *  dropdown opened inside has to reach past the edge. */
export function AnimatedHeight({ className = "", innerClassName = "", children, ...props }: AnimatedHeightProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<{ height: number | "auto"; duration: number }>({ height: "auto", duration: 0 });

  useEffect(() => {
    const inner = innerRef.current;
    // without it (an old WebView, jsdom) the height just stays auto
    if (!inner || typeof ResizeObserver === "undefined") return;
    let current: number | null = null;
    let changedAt = -Infinity;
    let unclipTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      // the border box: the inner block carries the card's padding
      const height = inner.offsetHeight;
      if (height === current) return;
      const now = performance.now();
      const duration = current === null || now - changedAt < STREAM_GAP_MS ? 0 : DURATION_S;
      const outer = outerRef.current;
      // set before paint: React commits the new height a frame later
      if (current !== null && outer) {
        outer.style.overflow = "hidden";
        clearTimeout(unclipTimer);
        // a timer, not the animation's end: a size that bounces back before a render never animates
        unclipTimer = setTimeout(() => {
          outer.style.overflow = "";
        }, duration * 1000 + UNCLIP_MARGIN_MS);
      }
      current = height;
      changedAt = now;
      setTarget({ height, duration });
    });
    observer.observe(inner);
    return () => {
      observer.disconnect();
      clearTimeout(unclipTimer);
    };
  }, []);

  return (
    <motion.div
      ref={outerRef}
      initial={false}
      animate={{ height: target.height }}
      transition={{ duration: target.duration, ease: "easeOut" }}
      className={className}
    >
      {/* the rest of the props on the plain inner block: motion's own handlers clash with the DOM's */}
      <div ref={innerRef} className={innerClassName} {...props}>
        {children}
      </div>
    </motion.div>
  );
}
