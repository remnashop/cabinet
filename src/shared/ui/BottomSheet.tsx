import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTelegramBackButton } from "@shared/telegram";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const FOCUSABLE =
  "a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled])";

/** Sheet from the bottom on mobile, centered dialog from lg. Closes on backdrop, Esc and the Mini App back button. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // a stable identity: an inline onClose would re-subscribe the back button (show/hide flicker) every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const stableClose = useCallback(() => onCloseRef.current(), []);
  useTelegramBackButton(open ? stableClose : null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Tab is kept inside the panel
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
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
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 backdrop-blur-sm lg:items-center lg:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="flex max-h-[calc(var(--tg-viewport-stable-height,100dvh)*0.85)] w-full flex-col rounded-t-dialog border border-white/[0.14] bg-popover/90 pb-[var(--safe-bottom)] shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6)] outline-none backdrop-blur-2xl lg:max-w-md lg:rounded-dialog lg:pb-0"
          >
            <h2 id={titleId} className="px-5 pb-2 pt-5 text-base font-semibold text-foreground">
              {title}
            </h2>
            <div className="overflow-y-auto px-5 pb-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
