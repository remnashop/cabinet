import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { useNavItems } from "@widgets/app-shell/nav-items";

// A floating pill: a glass capsule hugging its tabs, centered over the page; the slot is click-through so
// taps beside the capsule reach the content. 66px capsule + 12px offset fit main's 80px bottom padding.
export function BottomNav() {
  const { t } = useTranslation();
  const navItems = useNavItems();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center pb-[calc(var(--safe-bottom)+12px)] lg:hidden">
      <div className="pointer-events-auto flex max-w-[calc(100%-1.5rem)] gap-0.5 rounded-3xl border border-white/[0.14] bg-popover/60 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(232,236,251,0.16)] backdrop-blur-2xl backdrop-saturate-150">
        {navItems.map(({ key, to, end, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative isolate flex min-h-[52px] w-16 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* one layoutId, so the highlight glides between tabs, as the sidebar's */}
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-2xl bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="max-w-full truncate leading-none">{t(`nav.${key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
