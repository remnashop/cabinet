import { Headset, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useMatch, useResolvedPath } from "react-router";

import { PILL_SPRING } from "@shared/lib/motion";
import { useNavItems } from "@widgets/app-shell/nav-items";
import { useSupport } from "@widgets/support/use-support";

// the panel's mobile header bar: the frame's glass, floating over the page
const GLASS = "border border-glass-border bg-surface/50 shadow-2xl backdrop-blur-[28px] backdrop-saturate-150";

// A floating pill: a glass capsule across the screen, 16px off the sides; off the bottom it sits in the iOS
// home-indicator inset (16px where there is none), as the native floating tab bar, not 16px above it. The slot is
// click-through so taps beside the capsule reach the content. main's 96px bottom padding is the 64px capsule with 16px
// on both sides, so the last card scrolls clear of it. When every tab's name fits beside its icon (an invisible probe
// row measures them), all tabs are labelled. Otherwise icons only, but the active tab names its page: tabs are flex-auto,
// so the label's own width animation widens its tab frame by frame, with nothing else to fall out of step with.
// One layout animation for the whole bar: a tab's width (its label in or out), its neighbours' shift and the active
// pill's glide are measured in the same pass, on the same spring. Animated apart (the label's width on its own, the pill
// by layoutId), the pill aimed at a tab still growing under it and wobbled. The wrapper scales during the glide, so
// what's inside is motion with layout="position", which Motion keeps undistorted; overflow-hidden keeps a label that
// lands at its full width inside the tab while the tab is still growing to it.
const TAB_SLOT = "relative isolate flex min-w-0 flex-auto overflow-hidden rounded-full";
const TAB =
  "flex min-h-[50px] w-full min-w-0 items-center justify-center rounded-full transition-colors";

const LABEL = "text-sm font-semibold whitespace-nowrap";

type TabProps = { label: string; to: string; end: boolean; icon: LucideIcon; labeled: boolean };

function NavTab({ label, to, end, icon: Icon, labeled }: TabProps) {
  // NavLink's rule: the path itself, or below it unless `end`
  const isActive = useMatch({ path: useResolvedPath(to).pathname, end }) !== null;
  return (
    <motion.div layout transition={PILL_SPRING} className={TAB_SLOT}>
      {isActive && (
        <motion.span
          layoutId="bottom-nav-active-pill"
          className="absolute inset-0 -z-10 rounded-full bg-accent"
          transition={PILL_SPRING}
        />
      )}
      <NavLink
        to={to}
        end={end}
        className={`${TAB} ${isActive ? "text-primary" : "text-muted-foreground"}`}
      >
        <motion.span layout="position" transition={PILL_SPRING} className="flex shrink-0">
          <Icon className="size-[22px]" strokeWidth={isActive ? 2.5 : 2.25} />
        </motion.span>
        {(labeled || isActive) && (
          <motion.span
            layout="position"
            className={`${LABEL} pl-1.5`}
            initial={labeled ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={PILL_SPRING}
          >
            {label}
          </motion.span>
        )}
      </NavLink>
    </motion.div>
  );
}

function SupportTab({ support, labeled }: { support: ReturnType<typeof useSupport>; labeled: boolean }) {
  const { t } = useTranslation();
  // nowhere to send anyone: no tab
  if (!support.available) return null;
  return (
    <>
      {/* in the same layout pass as the tabs: it slides over as they resize */}
      <motion.div layout transition={PILL_SPRING} className={TAB_SLOT}>
        <button type="button" onClick={support.open} className={`${TAB} text-muted-foreground`}>
          <motion.span layout="position" transition={PILL_SPRING} className="flex shrink-0">
            <Headset className="size-[22px]" strokeWidth={2.25} />
          </motion.span>
          {labeled && (
            <motion.span layout="position" className={`${LABEL} pl-1.5`}>
              {t("help.support")}
            </motion.span>
          )}
        </button>
      </motion.div>
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
      <div ref={barRef} className={`pointer-events-auto relative mx-auto flex w-full max-w-[528px] rounded-full p-1.5 ${GLASS}`}>
        {/* every tab at its natural width with a 12px side padding, the bar's own p-1.5 included */}
        <div ref={probeRef} className="invisible absolute flex w-max p-1.5">
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
