import { X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { EASE_SOFT, FADE_IN, FADE_OUT } from "@shared/lib/motion";
import { useTelegramBackButton } from "@shared/telegram";

interface BottomSheetProps {
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
  /** no panel: the content stands on the blurred backdrop, as a success screen; the title only names it for readers */
  bare?: boolean;
}

const ICON_TONE = {
  glass: "border-glass-border bg-white/[0.05] text-foreground backdrop-blur-md",
  danger: "border-error/30 bg-error/10 text-error",
} as const;

/** The panel's glass surface: a dialog, a popover. Shape and padding are the caller's. */
export const GLASS =
  "border border-white/[0.14] bg-popover/60 shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6),inset_0_1px_0_rgba(232,236,251,0.16)] backdrop-blur-2xl backdrop-saturate-150";

const FOCUSABLE =
  "a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled])";

/** The dashboard's centered modal on every screen, a header with a close button. Closes on backdrop, Esc and the Mini App back button. */
export function BottomSheet({
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
}: BottomSheetProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // a stable identity: an inline onClose would re-subscribe the back button (show/hide flicker) every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const stableClose = useCallback(() => onCloseRef.current?.(), []);
  // focused as it mounts: the panel turning bare is a new element, Esc must keep reaching it
  const setPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    el?.focus();
  }, []);
  useTelegramBackButton(open && onClose ? stableClose : null);

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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-3xl"
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
              role="dialog"
              aria-modal="true"
              aria-label={title}
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
            key="panel"
            ref={setPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            initial={reduced ? false : { opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: FADE_IN }}
            exit={reduced ? { opacity: 0, transition: FADE_OUT } : { opacity: 0, scale: 0.94, y: 8, transition: FADE_OUT }}
            className={`flex max-h-[calc(var(--tg-viewport-stable-height,100dvh)*0.85)] w-full ${narrow ? "max-w-sm" : "max-w-2xl"} flex-col rounded-dialog outline-none ${GLASS}`}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
              {(Icon || glyph) && (
                <div className={`-mr-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border ${ICON_TONE[iconTone]}`}>
                  {Icon ? <Icon className="size-4" /> : glyph}
                </div>
              )}
              <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-bold text-foreground">
                {title}
              </h2>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
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
