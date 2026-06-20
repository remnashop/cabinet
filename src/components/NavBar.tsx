import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", key: "nav.subscription" },
  { to: "/devices", key: "nav.devices" },
];

export function NavBar() {
  const { t } = useTranslation();
  return (
    <nav className="mx-auto flex max-w-md gap-1 p-4 pb-0">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100",
            )
          }
        >
          {t(tab.key)}
        </NavLink>
      ))}
    </nav>
  );
}
