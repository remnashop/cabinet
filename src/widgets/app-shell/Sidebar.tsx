import { ChevronsLeft, ChevronsRight, CircleQuestionMark, Gift, Info, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";

import { useBrandName } from "@entities/appearance/api";
import { BrandMark } from "@entities/appearance/BrandMark";
import { useReferralQuery } from "@entities/referral/api";
import { rewardTerms } from "@features/referral/links";
import { bounceTap } from "@shared/lib/bounceState";
import { toggleSidebarCollapsed, useSidebarCollapsed } from "@shared/lib/sidebar-collapse";
import { BounceIcon } from "@shared/ui/BounceIcon";
import { useNavItems } from "@widgets/app-shell/nav-items";
import { InfoDialog } from "@widgets/info/InfoDialog";

// only while the program runs and the user has a link to share; the referral page already leads with it
function InviteCard() {
  const { t, i18n } = useTranslation();
  const referral = useReferralQuery();
  const onReferralPage = useLocation().pathname.startsWith("/referral");
  if (onReferralPage || !referral.data?.program.enabled || !referral.data.referral_code) return null;
  return (
    // the icon rail has no room for it; a fixed width (w-62 less p-3.5 twice), so the text doesn't reflow while the
    // sidebar widens, it is uncovered instead
    <Link
      to="/referral"
      className="hidden w-[220px] shrink-0 rounded-2xl xl:group-data-expanded/sidebar:block border border-border bg-primary/[0.06] p-3 transition-colors hover:border-primary/45"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Gift className="size-4" />
        </span>
        {t("referral.title")}
      </span>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
        {rewardTerms(referral.data.program, t, i18n.language)}
      </p>
    </Link>
  );
}

const MotionNavLink = motion.create(NavLink);

// The panel's sidebar pill (nav-pill.ts). Icon rail: a 40px circle, icon dead centre. Expanded: a full-width row
// whose 17px icon keeps the same 11.5px inset on every side.
const PILL_SHAPE =
  "flex size-10 shrink-0 items-center justify-center gap-2.5 self-center rounded-full text-[13px] xl:group-data-expanded/sidebar:w-auto xl:group-data-expanded/sidebar:self-stretch xl:group-data-expanded/sidebar:justify-start xl:group-data-expanded/sidebar:pl-[11.5px] xl:group-data-expanded/sidebar:pr-2.5";
const PILL = `${PILL_SHAPE} font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground`;
// labels show from xl, and only while the sidebar is expanded
const LABEL = "hidden whitespace-nowrap xl:group-data-expanded/sidebar:inline";
const HINT_BUBBLE =
  "pointer-events-none z-50 w-max max-w-56 -translate-y-1/2 rounded-popover-item border border-white/[0.14] bg-popover px-3 py-2 text-xs text-foreground shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6)] transition-opacity duration-150";

interface Hint {
  text: string;
  top: number;
  left: number;
}

// the rail's label bubble, beside the hovered or focused row
function hintProps(text: string, onHint: (hint: Hint | null) => void) {
  const show = (event: { currentTarget: HTMLElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // flush with the content frame's edge (the aside's right side), not a fixed gap off the row
    const edge = event.currentTarget.closest("aside")?.getBoundingClientRect().right ?? rect.right + 14;
    onHint({ text, top: rect.top + rect.height / 2, left: edge });
  };
  return { onPointerEnter: show, onPointerLeave: () => onHint(null), onFocus: show, onBlur: () => onHint(null) };
}

function FooterButton({
  icon,
  label,
  onClick,
  onHint,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  onHint: (hint: Hint | null) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial="rest"
      whileHover="hover"
      {...bounceTap()}
      {...hintProps(label, onHint)}
      aria-label={label}
      className={PILL}
    >
      <BounceIcon icon={icon} size={17} hoverSize={23.5} />
      <span className={LABEL}>{label}</span>
    </motion.button>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const navItems = useNavItems();
  const brand = useBrandName();
  const [infoOpen, setInfoOpen] = useState(false);
  const collapsed = useSidebarCollapsed();
  const [hint, setHint] = useState<Hint | null>(null);
  // kept after leave so the bubble fades out in place instead of jumping
  const [lastHint, setLastHint] = useState<Hint | null>(null);
  const onHint = (next: Hint | null) => {
    setHint(next);
    if (next) setLastHint(next);
  };
  return (
    <aside
      data-expanded={collapsed ? undefined : ""}
      className="group/sidebar sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col overflow-y-auto overflow-x-hidden p-2.5 transition-[width,padding] duration-200 ease-out lg:flex xl:data-expanded:w-62 xl:data-expanded:p-3.5"
    >
      <div className="flex flex-col items-center gap-2 pb-5 xl:group-data-expanded/sidebar:flex-row">
        <Link
          to="/"
          className="flex min-w-0 items-center justify-center gap-2.5 rounded-xl px-2 pt-1.5 xl:group-data-expanded/sidebar:flex-1 xl:group-data-expanded/sidebar:justify-start"
        >
          <BrandMark className="size-8 shrink-0 text-primary" />
          <div className={`min-w-0 ${LABEL}`}>
            <span className="block truncate text-[15px] font-bold leading-[22px] tracking-tight text-foreground">{brand}</span>
            <span className="block truncate text-[11px] font-medium leading-4 text-muted-foreground">{t("app.tagline")}</span>
          </div>
        </Link>
        {/* pt matches the Link's, so the button lines up with the logo on whole pixels */}
        <div className="hidden xl:block xl:group-data-expanded/sidebar:pt-1.5">
          <motion.button
            type="button"
            aria-label={t(collapsed ? "sidebar.expand" : "sidebar.collapse")}
            onClick={toggleSidebarCollapsed}
            initial="rest"
            whileHover="hover"
            {...bounceTap(0.12)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <BounceIcon icon={collapsed ? ChevronsRight : ChevronsLeft} size={17} hoverSize={21.25} />
          </motion.button>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ key, to, end, icon: Icon }) => (
          <MotionNavLink
            key={key}
            to={to}
            end={end}
            initial="rest"
            whileHover="hover"
            {...bounceTap()}
            {...hintProps(t(`nav.${key}`), onHint)}
            // the rail hides the label (display: none), so the link names itself
            aria-label={t(`nav.${key}`)}
            className={({ isActive }) => (isActive ? `relative isolate ${PILL_SHAPE} font-semibold text-primary` : PILL)}
          >
            {({ isActive }) => (
              <>
                {/* one layoutId, so the highlight glides between rows instead of jumping */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <BounceIcon icon={Icon} size={17} hoverSize={23.5} />
                <span className={LABEL}>{t(`nav.${key}`)}</span>
              </>
            )}
          </MotionNavLink>
        ))}
      </nav>

      {/* Icon rail only. In the body: the sticky aside is its own stacking context, and the frame after it would
          paint over the bubble; fixed, as the aside scrolls and would clip it */}
      {lastHint &&
        createPortal(
          // an expanded sidebar (xl, not collapsed) shows the labels already
          <span
            className={`${HINT_BUBBLE} ${collapsed ? "" : "xl:hidden"}`}
            style={{ position: "fixed", top: lastHint.top, left: lastHint.left, opacity: hint ? 1 : 0 }}
          >
            {lastHint.text}
          </span>,
          document.body,
        )}

      {/* sign-out lives in the header's account menu, as in the panel */}
      <div className="mt-auto flex flex-col gap-3.5">
        <InviteCard />
        <div className="flex flex-col gap-0.5 border-t border-border pt-3.5">
          {/* a stub until the shop has a support link setting */}
          <FooterButton icon={CircleQuestionMark} label={t("help.support")} onHint={onHint} />
          <FooterButton icon={Info} label={t("help.info")} onClick={() => setInfoOpen(true)} onHint={onHint} />
        </div>
      </div>
      <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
    </aside>
  );
}
