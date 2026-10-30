import { Headset, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { PILL_SPRING } from "@shared/lib/motion";
import { GLASS } from "@shared/ui/BottomSheet";
import { useNavItems } from "@widgets/app-shell/nav-items";
import { useSupport } from "@widgets/support/use-support";

// A floating pill: a glass capsule across the screen, 16px off the sides; off the bottom it sits in the iOS
// home-indicator inset (16px where there is none), as the native floating tab bar, not 16px above it. The slot is
// click-through so taps beside the capsule reach the content. main's 96px bottom padding is the 64px capsule with 16px
// on both sides, so the last card scrolls clear of it. When every tab's name fits beside its icon (an invisible probe
// row measures them), all tabs are labelled. Otherwise icons only, but the active tab names its page: tabs are flex-auto,
// so the label's own width animation widens its tab frame by frame, with nothing else to fall out of step with.
const TAB =
  "relative isolate flex min-h-[50px] min-w-0 flex-auto items-center justify-center rounded-full transition-colors";

const LABEL = "text-[13px] font-semibold whitespace-nowrap";

type TabProps = { label: string; to: string; end: boolean; icon: LucideIcon; labeled: boolean };

function NavTab({ label, to, end, icon: Icon, labeled }: TabProps) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) => `${TAB} ${isActive ? "text-primary" : "text-muted-foreground"}`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="bottom-nav-active-pill"
              className="absolute inset-0 -z-10 rounded-full bg-accent"
              transition={PILL_SPRING}
            />
          )}
          <Icon className="size-[22px] shrink-0" strokeWidth={isActive ? 2.5 : 2.25} />
          {labeled ? (
            <span aria-hidden className={`${LABEL} pl-1.5`}>
              {label}
            </span>
          ) : (
            <AnimatePresence initial={false}>
              {isActive && (
                <motion.span
                  aria-hidden
                  className={`${LABEL} shrink-0 overflow-hidden`}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={PILL_SPRING}
                >
                  <span className="pl-1.5">{label}</span>
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </NavLink>
  );
}

function SupportTab({ support, labeled }: { support: ReturnType<typeof useSupport>; labeled: boolean }) {
  const { t } = useTranslation();
  // nowhere to send anyone: no tab
  if (!support.available) return null;
  return (
    <>
      <button
        type="button"
        aria-label={t("help.support")}
        onClick={support.open}
        className={`${TAB} text-muted-foreground`}
      >
        <Headset className="size-[22px] shrink-0" strokeWidth={2.25} />
        {labeled && (
          <span aria-hidden className={`${LABEL} pl-1.5`}>
            {t("help.support")}
          </span>
        )}
      </button>
      {support.dialog}
    </>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const navItems = useNavItems();
  const support = useSupport();
  const labels = navItems.map(({ key }) => t(`nav.${key}`));
  if (support.available) labels.push(t("help.support"));

  const barRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [labeled, setLabeled] = useState(false);
  // the probe re-measures on its own resize too: a language switch or a late web font changes the labels' width
  useLayoutEffect(() => {
    const bar = barRef.current!;
    const probe = probeRef.current!;
    const check = () => setLabeled(probe.offsetWidth <= bar.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(bar);
    observer.observe(probe);
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(var(--safe-bottom),16px)] lg:hidden">
      {/* the dialogs' glass: dark and heavily blurred, so a bright button scrolling under it can't drown the tabs */}
      <div ref={barRef} className={`pointer-events-auto relative flex w-full rounded-full p-1.5 ${GLASS}`}>
        {/* every tab at its natural width with a 12px side padding, the bar's own p-1.5 included */}
        <div ref={probeRef} aria-hidden className="invisible absolute flex w-max p-1.5">
          {labels.map((label) => (
            <div key={label} className="flex items-center px-3">
              <div className="size-[22px]" />
              <span className={`${LABEL} pl-1.5`}>{label}</span>
            </div>
          ))}
        </div>
        {navItems.map(({ key, to, end, icon }) => (
          <NavTab key={key} label={t(`nav.${key}`)} to={to} end={end} icon={icon} labeled={labeled} />
        ))}
        <SupportTab support={support} labeled={labeled} />
      </div>
    </nav>
  );
}
