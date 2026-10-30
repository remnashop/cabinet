import { act } from "react";

/** Lets timers and React work run: TanStack Query notifies through setTimeout, so one act() flush isn't enough. */
export const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));

/** Retries `check` (an expect) until it passes or `timeout` runs out: a slow test run gets the time it needs. */
export async function until(check: () => void, timeout = 2000) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      return check();
    } catch (err) {
      if (Date.now() > end) throw err;
    }
    await tick();
  }
}
