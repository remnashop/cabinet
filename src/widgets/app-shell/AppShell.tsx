import { Suspense } from "react";
import { Outlet } from "react-router";

import { LegalReacceptanceGate } from "@features/legal-reacceptance/LegalReacceptanceGate";
import { Spinner } from "@shared/ui/Spinner";
import { BottomNav } from "@widgets/app-shell/BottomNav";
import { Sidebar } from "@widgets/app-shell/Sidebar";

export function AppShell() {
  return (
    <div className="min-h-[var(--tg-viewport-stable-height,100dvh)] lg:mx-auto lg:flex lg:max-w-[1280px]">
      <Sidebar />
      <main className="mx-auto w-full max-w-[960px] min-w-0 px-4 pt-[calc(var(--safe-top)+16px)] pb-[calc(var(--safe-bottom)+80px)] lg:my-3 lg:mr-3 lg:min-h-[calc(100dvh-1.5rem)] lg:max-w-none lg:rounded-3xl lg:border lg:border-glass-border lg:bg-surface/50 lg:px-8 lg:pt-8 lg:pb-8 lg:shadow-2xl lg:backdrop-blur-[28px] lg:backdrop-saturate-150">
        <Suspense fallback={<Spinner size="page" />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
      <LegalReacceptanceGate />
    </div>
  );
}
