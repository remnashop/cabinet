// Shared motion values, so a page, a step and a dialog move alike. styles.css repeats EASE_SOFT in its keyframes.

/** The soft ease-out of entrances: counters, the shell's intro, pop and list-row-in. */
export const EASE_SOFT = [0.2, 0.8, 0.2, 1] as const;

/** A cross-fade: in a little slower than out. */
export const FADE_IN = { duration: 0.18, ease: "easeOut" } as const;
export const FADE_OUT = { duration: 0.15, ease: "easeIn" } as const;

/** The active pill gliding to its item (sidebar, bottom nav, wizard steps). */
export const PILL_SPRING = { type: "spring", stiffness: 400, damping: 34 } as const;
