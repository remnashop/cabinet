import { Suspense } from "react";
import { Outlet } from "react-router";

import { Spinner } from "@shared/ui/Spinner";
import { BottomNav } from "@widgets/app-shell/BottomNav";
import { Sidebar } from "@widgets/app-shell/Sidebar";

export function AppShell() {
  return (
    <div className="min-h-[var(--tg-viewport-stable-height,100dvh)] lg:flex">
      <Sidebar />
      <main className="mx-auto w-full max-w-[960px] px-4 pt-[calc(var(--safe-top)+16px)] pb-[calc(var(--safe-bottom)+80px)] lg:px-8 lg:pt-8 lg:pb-8">
        <Suspense fallback={<Spinner size="page" />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
