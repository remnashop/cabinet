import { X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { EASE_SOFT, FADE_IN, FADE_OUT } from "@shared/lib/motion";
import { useTelegramBackButton } from "@shared/telegram";
import { AnimatedHeight } from "@shared/ui/AnimatedHeight";
import { DialogContext } from "@shared/ui/surface";
import { Ripple } from "@shared/ui/Ripple";

interface ModalProps {
  open: boolean;
  /** none: the sheet can't be dismissed (no close button, Esc, backdrop or back button), only answered */
  onClose?: () => void;
  title: string;
  children: ReactNode;
  /** a form-sized panel instead of the reading width */
  narrow?: boolean;
  /** a circle before the title, as the panel's DialogHeader */
  icon?: LucideIcon;
  /** the circle's content instead of an icon, e.g. a brand logo (the panel DialogHeader's glyph) */
  glyph?: ReactNode;
  /** the circle's tone, the panel DialogHeader's: glass by default, danger for a destructive question */
  iconTone?: keyof typeof ICON_TONE;
  /** over the whole screen, sidebar included, as the legal re-acceptance; otherwise inside the app frame */
  fullScreen?: boolean;
  /** no panel: the content stands on the blurred backdrop, as a success screen; the title isn't shown */
  bare?: boolean;
  /** the body is plates only (Card, KpiTile, OptionRow...): 12px in, concentric with their 12px corners and the 24px
   *  of the dialog; text and forms keep 16px */
  cards?: boolean;
  /** one view of a sheet that has several (a list, then one of its documents): a new view swaps the panel, out and
   *  then in, under the same backdrop, instead of one sheet closing as another opens */
  view?: string;
}

const ICON_TONE = {
  glass: "border-glass-border bg-white/[0.05] text-foreground backdrop-blur-md",
  danger: "border-error/30 bg-error/10 text-error",
} as const;

// undefined: not in a sheet; null: in one whose strip hasn't mounted yet
const FooterContext = createContext<HTMLElement | null | undefined>(undefined);

/** The panel's dialog footer: a strip under a line, its buttons on the right (Button glass, then glassAccent or
 *  glassDanger). Rendered by the body, so the buttons keep its state; they land outside its DOM, so a form's submit
 *  button names its form (`form` attribute) for Enter to keep working. */
export function DialogFooter({ children }: { children: ReactNode }) {
  const el = useContext(FooterContext);
  // outside a sheet (a body rendered on its own) the buttons stay in place
  if (el === undefined) return children;
  return el && createPortal(children, el);
}

// The frame's backdrop-blur makes it the box of a dialog's fixed backdrop, so on desktop the backdrop covers the frame
// only: the sidebar and the margins round the frame stay live. A press there closes the top dialog, as one on the
// backdrop would, and goes no further (a sidebar link doesn't fire). Popovers and hints portal outside the shell, so
// a pick in them is left alone; a phone's backdrop already covers the screen.
const outsideCloses: (() => void)[] = [];
const OUTSIDE_EVENTS = ["pointerdown", "mousedown", "click"] as const;

function onPressOutsideFrame(event: Event) {
  const close = outsideCloses[outsideCloses.length - 1];
  const target = event.target as Element | null;
  // the shell, or the page past its 1280px on a wide screen
  const outside = target?.closest?.("[data-app-shell]") || target?.matches?.("html, body, #root");
  if (!close || !outside || target!.closest("[data-app-frame]")) return;
  if (!window.matchMedia("(width >= 64rem)").matches) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.type === "click") close();
}

function useOutsideFrameDismiss(close: (() => void) | null) {
  useEffect(() => {
    if (!close) return;
    outsideCloses.push(close);
    if (outsideCloses.length === 1) OUTSIDE_EVENTS.forEach((type) => document.addEventListener(type, onPressOutsideFrame, true));
    return () => {
      outsideCloses.splice(outsideCloses.lastIndexOf(close), 1);
      if (outsideCloses.length === 0) OUTSIDE_EVENTS.forEach((type) => document.removeEventListener(type, onPressOutsideFrame, true));
    };
  }, [close]);
}

const FOCUSABLE =
  "a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled])";

/** The dashboard's centered modal on every screen, a header with a close button. Closes on backdrop, Esc and the Mini App back button. */
export function Modal({
  open,
  onClose,
  title,
  children,
  narrow,
  icon: Icon,
  glyph,
  iconTone = "glass",
  fullScreen,
  bare,
  cards,
  view = "panel",
}: ModalProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  // a stable identity: an inline onClose would re-subscribe the back button (show/hide flicker) every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const stableClose = useCallback(() => onCloseRef.current?.(), []);
  // focused as it mounts: the panel turning bare is a new element, Esc must keep reaching it. Not over a field's
  // autoFocus: it lands first (the ref attaches after the children mount), and the panel would take it away
  const setPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    if (el && !el.contains(document.activeElement)) el.focus();
  }, []);
  useTelegramBackButton(open && onClose ? stableClose : null);
  // a full-screen sheet's backdrop already covers the sidebar
  useOutsideFrameDismiss(open && onClose && !fullScreen ? stableClose : null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Tab is kept inside the panel
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && onClose) {
      event.stopPropagation();
      onClose();
    } else if (event.key === "Tab" && panelRef.current) {
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      const wrapTo = !first
        ? null
        : event.shiftKey && document.activeElement === first
          ? last
          : !event.shiftKey && document.activeElement === last
            ? first
            : undefined;
      if (wrapTo !== undefined) event.preventDefault();
      wrapTo?.focus();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // in the frame the glass panel frosts the page itself, so the backdrop only dims (the panel's Modal); over the
          // whole screen the page melts into the shader's glow (the panel's donate dialog), and bare content, with no
          // panel, stands on that too
          className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition-[background-color,backdrop-filter] duration-300 ${
            bare || fullScreen ? "bg-black/55 backdrop-blur-3xl" : "bg-black/30"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: reduced ? { duration: 0 } : FADE_IN }}
          exit={{ opacity: 0, transition: reduced ? { duration: 0 } : FADE_OUT }}
          onClick={onClose}
        >
          {/* propagate: closing plays the content's exit too; mode wait: the panel leaves before its bare content comes */}
          <AnimatePresence mode="wait" propagate>
          {bare ? (
            <motion.div
              key="bare"
              ref={setPanel}
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={onKeyDown}
              initial={reduced ? false : { opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: EASE_SOFT } }}
              exit={reduced ? { opacity: 0, transition: FADE_OUT } : { opacity: 0, scale: 0.94, y: 8, transition: FADE_OUT }}
              className="flex w-full max-w-xs flex-col outline-none"
            >
              {children}
            </motion.div>
          ) : (
          <motion.div
            key={view}
            ref={setPanel}
            data-dialog
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            initial={reduced ? false : { opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: FADE_IN }}
            exit={reduced ? { opacity: 0, transition: FADE_OUT } : { opacity: 0, scale: 0.94, y: 8, transition: FADE_OUT }}
            className={`flex max-h-[calc(var(--tg-viewport-stable-height,100dvh)*0.85)] w-full ${narrow ? "max-w-sm" : "max-w-2xl"} flex-col rounded-dialog outline-none glass-dialog`}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] p-4">
              {(Icon || glyph) && (
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${ICON_TONE[iconTone]}`}>
                  {Icon ? <Icon className="size-4" /> : glyph}
                </div>
              )}
              {/* two lines before it cuts: a long question stays readable on a phone */}
              <h2 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  // 36px like the header circle, no edge or fill of its own: the panel DialogHeader's IconButton
                  className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <Ripple />
                  <X className="size-4" />
                </button>
              )}
            </div>
            {/* eases to its content (a list loading in, a step switching); past the panel's max height it scrolls.
                shrink, not flex-1: a zero basis would ignore the eased height */}
            <AnimatedHeight className="min-h-0 shrink overflow-y-auto" innerClassName={cards ? "p-3" : "p-4"}>
              <DialogContext.Provider value>
                <FooterContext.Provider value={footerEl}>{children}</FooterContext.Provider>
              </DialogContext.Provider>
            </AnimatedHeight>
            {/* DialogFooter's buttons land here; empty, the strip is gone */}
            <div ref={setFooterEl} className="flex shrink-0 justify-end gap-2 border-t border-white/[0.08] p-4 empty:hidden" />
          </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    // inside the app frame on desktop (AppShell); the login page and other bare screens use the body
    (!fullScreen && document.getElementById("dialog-root")) || document.body,
  );
}
