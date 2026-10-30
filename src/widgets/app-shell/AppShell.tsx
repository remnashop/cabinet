import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, useState } from "react";
import { useLocation, useOutlet } from "react-router";

import { revokeSession } from "@features/auth/logout";
import { LegalReacceptanceGate } from "@features/legal-reacceptance/LegalReacceptanceGate";
import { clearAccessToken } from "@shared/api/tokens";
import type { INTRO_STATE } from "@shared/lib/intro";
import { EASE_SOFT, FADE_IN, FADE_OUT } from "@shared/lib/motion";
import { useSidebarCollapsed } from "@shared/lib/sidebar-collapse";
import { Spinner } from "@shared/ui/Spinner";
import { BottomNav } from "@widgets/app-shell/BottomNav";
import { Sidebar } from "@widgets/app-shell/Sidebar";
import { SignOutContext } from "@widgets/app-shell/sign-out";
import { HeaderActions } from "@widgets/header-actions/HeaderActions";
import { HeaderSlotContext } from "@widgets/page-header/header-slot";

// The panel's AnimatedOutlet: a fade keyed by the first path segment, so /profile → /profile/payments doesn't
// fade the section; useOutlet() keeps the exiting page rendering its own route while it fades out.
function AnimatedOutlet({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname.split("/")[1]}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: FADE_IN }}
        exit={{ opacity: 0, transition: FADE_OUT }}
      >
        <Suspense fallback={<Spinner size="page" />}>{outlet}</Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export function AppShell() {
  const location = useLocation();
  const queryClient = useQueryClient();
  // home lays its own two columns across the whole frame
  const wide = location.pathname === "/";
  const isIntro = (location.state as typeof INTRO_STATE | null)?.intro === true;
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [leaving, setLeaving] = useState(false);
  const sidebarCollapsed = useSidebarCollapsed();
  const signOut = () => {
    if (!leaving) void revokeSession().then(() => setLeaving(true));
  };
  // the token goes only once the fade-out ends: RequireAuth would cut it short, and nothing mid-fade hits a 401
  const onLeft = () => {
    clearAccessToken();
    queryClient.clear();
  };
  return (
    <SignOutContext.Provider value={signOut}>
    <motion.div
      // a collapsed sidebar gives its 176px (w-62 - 72px) back by narrowing the shell, not widening the frame, on
      // the sidebar's own timing (the panel's DashboardShell)
      className={`min-h-[var(--tg-viewport-stable-height,100dvh)] transition-[max-width] duration-200 ease-out lg:mx-auto lg:flex lg:h-dvh lg:max-w-[min(1280px,100%)] ${
        sidebarCollapsed ? "xl:max-w-[calc(min(1280px,100%)-11rem)]" : ""
      }`}
      initial={isIntro ? { opacity: 0 } : false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={leaving ? { duration: 0.3, ease: "easeIn" } : { duration: 0.35, ease: "easeOut" }}
      onAnimationComplete={() => leaving && onLeft()}
    >
      <Sidebar />
      {/* desktop: a screen-tall glass frame that scrolls inside, as the panel's DashboardLayout; a phone scrolls the page */}
      <motion.div
        initial={isIntro ? { opacity: 0, y: 14 } : false}
        animate={leaving ? { opacity: 0, y: 14 } : { opacity: 1, y: 0 }}
        transition={leaving ? { duration: 0.25, ease: "easeIn" } : { delay: 0.1, duration: 0.4, ease: EASE_SOFT }}
        className="min-w-0 lg:my-3 lg:mr-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:rounded-3xl lg:border lg:border-glass-border lg:bg-surface/50 lg:shadow-2xl lg:backdrop-blur-[28px] lg:backdrop-saturate-150">
        {/* the panel's Header: across the frame and outside its scroller on desktop; pages put their title in the
            slot (HeaderSlot), the actions stay; a phone scrolls it away with the page */}
        <header className="mx-auto flex min-h-9 w-full max-w-[960px] min-w-0 items-center gap-3 px-4 pb-5 pt-[calc(var(--safe-top)+16px)] lg:max-w-none lg:shrink-0 lg:px-8 lg:py-5">
          <div ref={setHeaderSlot} className="flex min-w-0 flex-1 items-center gap-2" />
          <HeaderActions />
        </header>
        {/* the stable gutter's 10px (the scrollbar, app/styles.css) comes out of the right padding */}
        <main
          className={`mx-auto w-full max-w-[960px] min-w-0 px-4 pb-[calc(max(var(--safe-bottom),16px)+80px)] lg:max-w-none lg:flex-1 lg:overflow-y-auto lg:pl-8 lg:pr-[calc(2rem-10px)] lg:pt-4 lg:pb-8 lg:[scrollbar-gutter:stable] ${wide ? "lg:flex lg:flex-col" : ""}`}
        >
          <HeaderSlotContext.Provider value={headerSlot}>
            <AnimatedOutlet className={wide ? "lg:flex lg:flex-1 lg:flex-col" : undefined} />
          </HeaderSlotContext.Provider>
        </main>
        {/* dialogs portal here, beside the scroller, not in it: the frame's backdrop-blur makes it their fixed box,
            so a dialog covers the frame and centers on it however far the page is scrolled */}
        <div id="dialog-root" />
      </motion.div>
      <BottomNav />
      <LegalReacceptanceGate />
    </motion.div>
    </SignOutContext.Provider>
  );
}
