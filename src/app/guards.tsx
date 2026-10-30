import { Suspense, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";

import { stashBotLinkToken } from "@features/auth/bot-signin-token";
import { useIsAuthenticated } from "@shared/api/tokens";
import { INTRO_STATE } from "@shared/lib/intro";
import { safeNext } from "@shared/lib/safe-redirect";
import { Spinner } from "@shared/ui/Spinner";
import { AppShell } from "@widgets/app-shell/AppShell";

export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useIsAuthenticated();
  const { pathname, search, hash } = useLocation();
  if (!authed) {
    // ?next= drops the hash, and /link/bot's token lives there
    if (pathname === "/link/bot") stashBotLinkToken(hash);
    return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return children;
}

// a signed-in user on /login (or one who just signed in there) goes on to ?next=
export function GuestOnly({ children }: { children: ReactNode }) {
  const authed = useIsAuthenticated();
  const [params] = useSearchParams();
  if (authed) return <Navigate to={safeNext(params.get("next"))} replace state={INTRO_STATE} />;
  return children;
}

// a page open to everyone that, signed in, sits in the shell like any other (the documents)
export function ShellIfSignedIn() {
  return useIsAuthenticated() ? <AppShell /> : <Outlet />;
}

export function Root() {
  return (
    <Suspense fallback={<Spinner size="page" />}>
      <Outlet />
    </Suspense>
  );
}
