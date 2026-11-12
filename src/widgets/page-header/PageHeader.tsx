import { ChevronLeft, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router";

import { isMiniApp, useTelegramBackButton } from "@shared/telegram";
import { NAV_ITEMS } from "@widgets/app-shell/nav-items";
import { HeaderSlot } from "@widgets/page-header/HeaderSlot";
import { Ripple } from "@shared/ui/Ripple";
import { IconCircle } from "@shared/ui/IconCircle";

// desktop: the capsule's 36px bordered circle, as the panel header's page icon
const BACK_CLASS =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] lg:border lg:border-glass-border lg:bg-white/[0.05] lg:text-foreground lg:hover:bg-white/[0.08]";

/** The page's icon at the start of the desktop header capsule (the panel Header's IconCircle); a phone has none. */
export function HeaderIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <IconCircle icon={Icon} header className="max-lg:hidden" />
  );
}

interface PageHeaderProps {
  title: string;
  /** a longer title for the desktop's wider header; a phone keeps `title` */
  desktopTitle?: string;
  /** a nested screen; Telegram's native back button replaces ours inside a Mini App */
  backTo?: string;
  /** in-page back (a wizard step); wins over backTo, drives Telegram's button too; keep it stable */
  onBack?: () => void;
  /** a sidebar destination: the sidebar is the way back on desktop, so the arrow stays on phones only */
  navItem?: boolean;
}

export function PageHeader({ title, desktopTitle, backTo, onBack, navItem }: PageHeaderProps) {
  const navigate = useNavigate();
  const goBack = useCallback(() => {
    // replace: a native back that pushed would stack /profile ↔ /profile/payments forever
    if (backTo) void navigate(backTo, { replace: true });
  }, [backTo, navigate]);
  const handler = onBack ?? (backTo ? goBack : null);
  useTelegramBackButton(handler);
  const backClass = navItem ? `${BACK_CLASS} lg:hidden` : BACK_CLASS;
  // a sidebar destination has no back on desktop: its nav icon starts the capsule instead
  const { pathname } = useLocation();
  const navIcon = navItem ? NAV_ITEMS.find((item) => matchPath({ path: item.to, end: item.end }, pathname))?.icon : undefined;

  return (
    <HeaderSlot>
      {handler &&
        !isMiniApp() &&
        (onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            <Ripple />
            <ChevronLeft className="size-5 lg:size-4" />
          </button>
        ) : (
          <Link to={backTo!} className={backClass}>
            <Ripple />
            <ChevronLeft className="size-5 lg:size-4" />
          </Link>
        ))}
      {navIcon && <HeaderIcon icon={navIcon} />}
      <h1 className="min-w-0 truncate text-xl font-bold tracking-tight lg:text-lg lg:font-semibold">
        {desktopTitle ? (
          <>
            <span className="lg:hidden">{title}</span>
            <span className="max-lg:hidden">{desktopTitle}</span>
          </>
        ) : (
          title
        )}
      </h1>
    </HeaderSlot>
  );
}
