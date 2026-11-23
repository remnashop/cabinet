import { createContext, useContext } from "react";

/** true inside a Modal: its blocks are the panel's 12px plates, not page cards */
export const DialogContext = createContext(false);

// the sheet's footer strip, where DialogFooter's buttons go. undefined: not in a sheet; null: in one whose strip
// hasn't mounted yet
export const FooterContext = createContext<HTMLElement | null | undefined>(undefined);

/** Inside a sheet, whose footer DialogFooter's buttons go to. */
export function useInsideDialog(): boolean {
  return useContext(FooterContext) !== undefined;
}

const PLATE = "border border-white/[0.08] bg-white/[0.03]";

/** A block's corners and fill, as the panel's: glass-panel with 24px corners on a page (round: the page blocks' 32px on
 *  a phone, 24px from lg), a 12px plate in a dialog. */
export function useSurface(round?: boolean): { shape: string; fill: string } {
  const inDialog = useContext(DialogContext);
  if (inDialog) return { shape: "rounded-xl", fill: PLATE };
  return {
    shape: round ? "rounded-card" : "rounded-3xl",
    fill: "glass-panel",
  };
}
