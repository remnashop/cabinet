import { Bell, Check, ChevronDown, Languages, LogOut, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useChangeLanguage, useMeQuery } from "@entities/session/api";
import { getErrorMessage } from "@shared/api/http";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@shared/i18n";
import { bounceTap } from "@shared/lib/bounceState";
import { BounceIcon } from "@shared/ui/BounceIcon";
import { useSignOut } from "@widgets/app-shell/sign-out";

const MotionLink = motion.create(Link);

// the panel's header popover: glass, grows out of its top-right corner toward the trigger
const POPOVER =
  "fixed z-[60] origin-top-right rounded-popover border border-white/[0.14] bg-popover/60 p-1.5 shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6),inset_0_1px_0_rgba(232,236,251,0.16)] backdrop-blur-2xl backdrop-saturate-150";
const POPOVER_MOTION = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
  transition: { duration: 0.15, ease: "easeOut" },
} as const;
const ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-popover-item px-2.5 text-left text-[13px] font-medium transition-colors hover:bg-white/[0.07]";

type Popover = "language" | "bell" | "user";

// Portalled to the body, as the panel's PortalPopover: rendered in place, the frame's own backdrop-filter becomes
// the popover's backdrop root and its glass stops blurring what is behind the frame. Measured on open only;
// HeaderActions closes it on scroll, when the trigger would move away from it.
function HeaderPopover({
  open,
  anchor,
  popoverRef,
  className,
  children,
}: {
  open: boolean;
  anchor: () => HTMLElement | null;
  popoverRef: RefObject<HTMLDivElement | null>;
  className: string;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const rect = open ? anchor()?.getBoundingClientRect() : undefined;
    if (rect) setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measured once per open
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && position && (
        <motion.div ref={popoverRef} {...POPOVER_MOTION} style={position} className={`${POPOVER} ${className}`}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Language, bell and account menu on the right of a page title, as the panel's Header. */
export function HeaderActions() {
  const { t, i18n } = useTranslation();
  const signOut = useSignOut();
  const me = useMeQuery();
  const [open, setOpen] = useState<Popover | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const changeLanguage = useChangeLanguage(() => setOpen(null));
  const current = (i18n.resolvedLanguage ?? "en") as SupportedLanguage;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !popoverRef.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    // capture: the desktop frame scrolls inside, not the window
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = (which: Popover) => {
    changeLanguage.reset();
    setOpen((shown) => (shown === which ? null : which));
  };
  const name = me.data?.name;

  // each menu hangs under its own button; the bell's w-80 one would leave a phone screen there, so below sm it
  // lines up with the whole group instead
  const bellAnchor = () => (window.matchMedia("(min-width: 640px)").matches ? bellRef.current : ref.current);
  return (
    <div ref={ref} className="ml-auto flex shrink-0 items-center gap-3.5">
      <div ref={languageRef} className="relative">
        <motion.button
          type="button"
          aria-label={t("header.language")}
          aria-expanded={open === "language"}
          onClick={() => toggle("language")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ willChange: "transform" }}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.05] px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
        >
          <Languages className="size-4 shrink-0" />
          {current.toUpperCase()}
        </motion.button>
        {/* the border lives on a static sibling, as in the panel: a rounded border scaled via transform thickens
            at the curved ends in Chrome */}
        <span className="pointer-events-none absolute inset-0 rounded-full border border-glass-border" />
        <HeaderPopover
          open={open === "language"}
          anchor={() => languageRef.current}
          popoverRef={popoverRef}
          className="min-w-44"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              disabled={changeLanguage.isPending}
              onClick={() => (language === current ? setOpen(null) : changeLanguage.mutate(language))}
              className={`${ITEM} text-foreground disabled:opacity-60`}
            >
              <span className="flex-1">{LANGUAGE_NAMES[language]}</span>
              {language === current && <Check className="size-[15px] text-primary" />}
            </button>
          ))}
          {changeLanguage.isError && (
            <p className="max-w-56 px-2.5 py-1.5 text-[12px] text-error">
              {getErrorMessage(changeLanguage.error, t("errors.generic"))}
            </p>
          )}
        </HeaderPopover>
      </div>

      <div ref={bellRef}>
        <motion.button
          type="button"
          aria-label={t("header.notifications")}
          aria-expanded={open === "bell"}
          onClick={() => toggle("bell")}
          {...bounceTap(0.12)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-border bg-white/[0.05] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <Bell className="size-[17px]" />
        </motion.button>
        <HeaderPopover
          open={open === "bell"}
          anchor={bellAnchor}
          popoverRef={popoverRef}
          className="w-80 max-w-[calc(100vw-2rem)]"
        >
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Bell className="size-5" />
            <p className="text-sm">{t("header.notificationsEmpty")}</p>
          </div>
        </HeaderPopover>
      </div>

      {/* a phone reaches the profile and sign-out from the bottom nav */}
      <div ref={userRef} className="hidden border-l border-border pl-3.5 lg:block">
        <motion.button
          type="button"
          aria-label={t("header.account")}
          aria-expanded={open === "user"}
          onClick={() => toggle("user")}
          {...bounceTap(0.05)}
          className="group relative isolate flex h-9 items-center gap-2.5 rounded-full pr-1"
        >
          <span className="absolute inset-0 -z-10 rounded-full transition-colors group-hover:bg-white/[0.06]" />
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-border bg-white/[0.05] text-[12px] font-bold text-foreground">
            {name ? (name.trim()[0] ?? "?").toUpperCase() : <User className="size-4" />}
          </span>
          {name && <span className="hidden max-w-40 truncate text-[13px] font-semibold sm:block">{name}</span>}
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform ${open === "user" ? "rotate-180" : ""}`}
          />
        </motion.button>
        <HeaderPopover open={open === "user"} anchor={() => userRef.current} popoverRef={popoverRef} className="w-48">
          <MotionLink
            to="/profile"
            onClick={() => setOpen(null)}
            className={`${ITEM} text-foreground`}
            initial="rest"
            whileHover="hover"
          >
            <BounceIcon icon={User} size={15} hoverSize={18.75} />
            {t("nav.profile")}
          </MotionLink>
          <motion.button
            type="button"
            onClick={() => {
              setOpen(null);
              signOut();
            }}
            className={`${ITEM} text-error`}
            initial="rest"
            whileHover="hover"
          >
            <BounceIcon icon={LogOut} size={15} hoverSize={18.75} />
            {t("common.logout")}
          </motion.button>
        </HeaderPopover>
      </div>
    </div>
  );
}
