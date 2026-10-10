import { Suspense, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";

import { useIsAuthenticated } from "@shared/api/tokens";
import { safeNext } from "@shared/lib/safe-redirect";
import { Spinner } from "@shared/ui/Spinner";

export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useIsAuthenticated();
  const { pathname, search } = useLocation();
  if (!authed) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  return children;
}

// a signed-in user on /login (or one who just signed in there) goes on to ?next=
export function GuestOnly({ children }: { children: ReactNode }) {
  const authed = useIsAuthenticated();
  const [params] = useSearchParams();
  if (authed) return <Navigate to={safeNext(params.get("next"))} replace />;
  return children;
}

export function Root() {
  return (
    <Suspense fallback={<Spinner size="page" />}>
      <Outlet />
    </Suspense>
  );
}
