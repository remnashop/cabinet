import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { NAV_ITEMS } from "@widgets/app-shell/nav-items";

// Four equal cells, icon over label: a scrolling pill strip hides the last tab on a 360-390px phone.
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-glass-border bg-canvas/80 pb-[var(--safe-bottom)] backdrop-blur-md lg:hidden">
      {NAV_ITEMS.map(({ key, to, end, icon: Icon }) => (
        <NavLink
          key={key}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          <Icon className="size-5" />
          {t(`nav.${key}`)}
        </NavLink>
      ))}
    </nav>
  );
}
