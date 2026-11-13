import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronDown, Languages, LogOut, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { useMarkNotificationsRead, useNotificationsQuery } from "@entities/notification/api";
import { useChangeLanguage, useMeQuery } from "@entities/session/api";
import { getErrorMessage } from "@shared/api/http";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@shared/i18n";
import { FADE_IN, FADE_OUT } from "@shared/lib/motion";
import { onServiceWorkerMessage } from "@shared/lib/push";
import { isMiniApp } from "@shared/telegram";
import { Avatar } from "@shared/ui/Avatar";
import { MotionLink } from "@shared/ui/MotionLink";
import { FormError } from "@shared/ui/FormError";
import { SignOutDialog } from "@widgets/app-shell/SignOutDialog";
import { useSupport } from "@widgets/support/use-support";

import { NotificationsList } from "./NotificationsList";
import { Ripple } from "@shared/ui/Ripple";

const MAX_BADGE = 9;


// the panel's header popover: glass, grows out of its top-right corner toward the trigger
const POPOVER = "fixed z-[60] flex origin-top-right flex-col rounded-popover p-1.5 glass-dialog";
const POPOVER_MOTION = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1, transition: FADE_IN },
  exit: { opacity: 0, scale: 0.85, transition: FADE_OUT },
} as const;
const ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-popover-item px-2.5 text-left text-sm font-medium transition-colors hover:bg-white/[0.06]";

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
  const [position, setPosition] = useState<{ top: number; right: number; maxWidth: number; maxHeight: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const rect = open ? anchor()?.getBoundingClientRect() : undefined;
    // kept inside a small window (the Mini App): 16px off its left and bottom edges, the bell's feed scrolls inside
    if (rect)
      setPosition({
        top: rect.bottom + 8,
        // clientWidth: without a classic scrollbar (a Mac with a mouse), which `fixed` doesn't count either
        right: document.documentElement.clientWidth - rect.right,
        maxWidth: rect.right - 16,
        maxHeight: document.documentElement.clientHeight - rect.bottom - 16,
      });
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
  const [signOutOpen, setSignOutOpen] = useState(false);
  const support = useSupport();
  const me = useMeQuery();
  const [open, setOpen] = useState<Popover | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const changeLanguage = useChangeLanguage(() => setOpen(null));
  const client = useQueryClient();
  const feed = useNotificationsQuery();
  const markRead = useMarkNotificationsRead();
  const unread = feed.data?.unread_count ?? 0;
  const current = (i18n.resolvedLanguage ?? "en") as SupportedLanguage;

  // a push arrived: the feed is stale before the next poll
  useEffect(
    () => onServiceWorkerMessage((message) => message.type === "notification" && void client.invalidateQueries({ queryKey: ["notifications"] })),
    [client],
  );

  // opening the bell reads the feed; the items keep their dots until it closes, then the feed reloads without them
  const bellOpen = open === "bell";
  useEffect(() => {
    if (bellOpen && unread > 0 && !markRead.isPending) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate on open or on news, not on every mutation state
  }, [bellOpen, unread]);
  const wasBellOpen = useRef(false);
  useEffect(() => {
    if (wasBellOpen.current && !bellOpen) void client.invalidateQueries({ queryKey: ["notifications"] });
    wasBellOpen.current = bellOpen;
  }, [bellOpen, client]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // the page moving under the trigger, not the popover's own list (the bell's feed scrolls inside it)
    const onScroll = (event: Event) => {
      if (!popoverRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    // capture: the desktop frame scrolls inside, not the window
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = (which: Popover) => {
    changeLanguage.reset();
    setOpen((shown) => (shown === which ? null : which));
  };
  const name = me.data?.name;

  // each menu hangs under its own button; the bell's wide one would leave a phone screen there, so below sm it
  // lines up with the whole group instead
  const bellAnchor = () => (window.matchMedia("(min-width: 640px)").matches ? bellRef.current : ref.current);
  return (
    <div ref={ref} className="ml-auto flex shrink-0 items-center gap-3.5 lg:gap-1">
      {/* under an open popover, over everything else: a press anywhere outside it only closes it, it can't land on a
          button beneath by accident (its trigger included: a second press on the bell closes it the same way) */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(null)} />,
          document.body,
        )}
      {/* a phone changes the language in the profile */}
      <div ref={languageRef} className="relative hidden lg:block">
        <motion.button
          type="button"
          onClick={() => toggle("language")}
          className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <Ripple />
          <Languages className="size-4 shrink-0" />
          {/* the language's own name, as the menu lists it */}
          {LANGUAGE_NAMES[current]}
        </motion.button>
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
              {language === current && <Check className="size-4 text-primary" />}
            </button>
          ))}
          {changeLanguage.isError && (
            <FormError className="max-w-56 px-2.5 py-1.5">
              {getErrorMessage(changeLanguage.error, t("errors.generic"))}
            </FormError>
          )}
        </HeaderPopover>
      </div>

      {/* dev only, dropped from builds: the mock panel's button portals here (mocks/DebugPanel); contents, so an
          empty slot takes no gap */}
      {import.meta.env.DEV && <span id="mock-debug-slot" className="contents" />}
      <div ref={bellRef}>
        <motion.button
          type="button"
          onClick={() => toggle("bell")}
          // a phone: its own glass-panel circle (the panel's IconButton tone="panel"); desktop: a plain item of the capsule
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground max-lg:glass-panel"
        >
          <Ripple />
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none tabular-nums text-primary-foreground">
              {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
            </span>
          )}
        </motion.button>
        <HeaderPopover
          open={open === "bell"}
          anchor={bellAnchor}
          popoverRef={popoverRef}
          className="w-[400px]"
        >
          <NotificationsList feed={feed} onClose={() => setOpen(null)} onSupport={support.available ? support.open : undefined} />
        </HeaderPopover>
      </div>

      {/* a phone reaches the profile and sign-out from the bottom nav */}
      <span className="mx-1 hidden h-5 w-px shrink-0 bg-white/[0.08] lg:block" />
      <div ref={userRef} className="hidden lg:block">
        <motion.button
          type="button"
          onClick={() => toggle("user")}
          className="group relative isolate flex h-9 items-center gap-2.5 rounded-full pl-0.5 pr-2.5"
        >
          <span className="absolute inset-0 -z-10 rounded-full transition-colors group-hover:bg-white/[0.06]" />
          <Ripple />
          <Avatar name={name} className="size-8 text-xs" />
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
          >
            <User className="size-4 shrink-0" />
            {t("nav.profile")}
          </MotionLink>
          {/* the Mini App signs back in with Telegram's data at once: no sign-out there */}
          {!isMiniApp() && (
            <motion.button
              type="button"
              onClick={() => {
                setOpen(null);
                setSignOutOpen(true);
              }}
              className={`${ITEM} text-error`}
            >
              <LogOut className="size-4 shrink-0" />
              {t("common.logout")}
            </motion.button>
          )}
        </HeaderPopover>
      </div>
      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} />
      {support.dialog}
    </div>
  );
}
