import { createContext, useContext } from "react";

/** true inside a BottomSheet: its blocks are the panel's 12px plates, not page cards */
export const DialogContext = createContext(false);

const PLATE = "border border-white/[0.08] bg-white/[0.03]";

/** A block's corners and fill, as the panel's: glass-panel with 24px corners on a page (round: the page blocks' 32px on
 *  a phone, 24px from lg), a 12px plate in a dialog. */
export function useSurface(round?: boolean): { shape: string; fill: string } {
  const inDialog = useContext(DialogContext);
  if (inDialog) return { shape: "rounded-xl", fill: PLATE };
  return {
    shape: round ? "rounded-home" : "rounded-3xl",
    fill: "glass-panel",
  };
}
