import { createContext } from "react";

/** The title spot in AppShell's header row; null outside the shell (bare screens, tests). */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);
