// Global multiplier for hover/tap "bounce" animations (icon growth, tap scale).
export const BOUNCE_STRENGTH = 0.3;

// `whileTap` prop shared by every bounce-on-tap element. Plain function, not
// a hook: some call sites are inside .map().
// No explicit `transition`: an underdamped spring overshoots, and small text
// judders as the browser re-hints it on every reversal.
export function bounceTap(multiplier = 0.05) {
  return {
    whileTap: { scale: 1 + multiplier * BOUNCE_STRENGTH },
  };
}
