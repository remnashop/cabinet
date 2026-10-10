import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { NAV_ITEMS } from "@widgets/app-shell/nav-items";

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-glass-border p-4 lg:flex">
      <div className="px-3 pb-4 text-lg font-semibold">{t("app.name")}</div>
      {NAV_ITEMS.map(({ key, to, end, icon: Icon }) => (
        <NavLink
          key={key}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-accent text-primary" : "text-foreground hover:bg-white/[0.06]"
            }`
          }
        >
          <Icon className="size-4" />
          {t(`nav.${key}`)}
        </NavLink>
      ))}
    </aside>
  );
}
