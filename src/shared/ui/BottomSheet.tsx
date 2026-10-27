import { X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { useTelegramBackButton } from "@shared/telegram";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** dialog: the dashboard's centered modal look on every screen (header with a close button) */
  variant?: "sheet" | "dialog";
  /** dialog only: a form-sized panel instead of the reading width */
  narrow?: boolean;
  /** dialog only: a circle before the title, as the panel's DialogHeader */
  icon?: LucideIcon;
  /** over the whole screen, sidebar included, as the legal re-acceptance; otherwise inside the app frame */
  fullScreen?: boolean;
}

const FOCUSABLE =
  "a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled])";

/** Sheet from the bottom on mobile, centered dialog from lg. Closes on backdrop, Esc and the Mini App back button. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  variant = "sheet",
  narrow,
  icon: Icon,
  fullScreen,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const dialog = variant === "dialog";
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
          className={
            dialog
              ? "fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-3xl"
              : "fixed inset-0 z-40 flex items-end justify-center bg-black/55 backdrop-blur-3xl lg:items-center lg:p-4"
          }
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
            {...(dialog
              ? {
                  initial: reduced ? false : { opacity: 0, scale: 0.94, y: 8 },
                  animate: { opacity: 1, scale: 1, y: 0 },
                  exit: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 },
                  transition: { duration: 0.18, ease: "easeOut" },
                }
              : {
                  initial: reduced ? false : { y: "100%" },
                  animate: { y: 0 },
                  exit: reduced ? { opacity: 0 } : { y: "100%" },
                  transition: { type: "spring", damping: 32, stiffness: 380 },
                })}
            className={
              dialog
                ? `flex max-h-[calc(var(--tg-viewport-stable-height,100dvh)*0.85)] w-full ${narrow ? "max-w-sm" : "max-w-2xl"} flex-col rounded-dialog border border-white/[0.14] bg-popover/60 shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6),inset_0_1px_0_rgba(232,236,251,0.16)] outline-none backdrop-blur-2xl backdrop-saturate-150`
                : "flex max-h-[calc(var(--tg-viewport-stable-height,100dvh)*0.85)] w-full flex-col rounded-t-dialog border border-white/[0.14] bg-popover/60 pb-[var(--safe-bottom)] shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6),inset_0_1px_0_rgba(232,236,251,0.16)] outline-none backdrop-blur-2xl backdrop-saturate-150 lg:max-w-md lg:rounded-dialog lg:pb-0"
            }
          >
            {dialog ? (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
                  {Icon && (
                    <div className="-mr-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                  )}
                  <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-bold text-foreground">
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("common.close")}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
              </>
            ) : (
              <>
                <h2 id={titleId} className="px-5 pb-2 pt-5 text-base font-bold text-foreground">
                  {title}
                </h2>
                <div className="overflow-y-auto px-5 pb-5">{children}</div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    // inside the app frame on desktop (AppShell); the login page and other bare screens use the body
    (!fullScreen && document.getElementById("dialog-root")) || document.body,
  );
}
