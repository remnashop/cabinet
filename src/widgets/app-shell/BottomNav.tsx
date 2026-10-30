import { Headset, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { PILL_SPRING } from "@shared/lib/motion";
import { GLASS } from "@shared/ui/BottomSheet";
import { useNavItems } from "@widgets/app-shell/nav-items";
import { useSupport } from "@widgets/support/use-support";

// A floating pill: a glass capsule across the screen, 16px off the sides; off the bottom it sits in the iOS
// home-indicator inset (16px where there is none), as the native floating tab bar, not 16px above it. The slot is
// click-through so taps beside the capsule reach the content. main's 96px bottom padding is the 64px capsule with 16px
// on both sides, so the last card scrolls clear of it. Icons only, but the active tab names its page: tabs are flex-auto,
// so the label's own width animation widens its tab frame by frame, with nothing else to fall out of step with.
const TAB =
  "relative isolate flex min-h-[50px] min-w-0 flex-auto items-center justify-center rounded-full transition-colors";

function NavTab({ label, to, end, icon: Icon }: { label: string; to: string; end: boolean; icon: LucideIcon }) {
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
          <AnimatePresence initial={false}>
            {isActive && (
              <motion.span
                aria-hidden
                className="shrink-0 overflow-hidden text-[13px] font-semibold whitespace-nowrap"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={PILL_SPRING}
              >
                <span className="pl-1.5">{label}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}

function SupportTab() {
  const { t } = useTranslation();
  const support = useSupport();
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
      </button>
      {support.dialog}
    </>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const navItems = useNavItems();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(var(--safe-bottom),16px)] lg:hidden">
      {/* the dialogs' glass: dark and heavily blurred, so a bright button scrolling under it can't drown the tabs */}
      <div className={`pointer-events-auto flex w-full rounded-full p-1.5 ${GLASS}`}>
        {navItems.map(({ key, to, end, icon }) => (
          <NavTab key={key} label={t(`nav.${key}`)} to={to} end={end} icon={icon} />
        ))}
        <SupportTab />
      </div>
    </nav>
  );
}
