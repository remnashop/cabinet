import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router";

import { router } from "@app/router";
import { bootSession, type BootResult } from "@features/auth/boot";
import { ApiError, getErrorMessage, setSessionEndHandler } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";
import { FullScreen } from "@widgets/full-screen/FullScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // a 4xx won't change on retry; 5xx and network errors might
      retry: (failureCount, error) => failureCount < 2 && !(error instanceof ApiError && error.status < 500),
      refetchOnWindowFocus: false,
    },
  },
});

// no navigate here: RequireAuth sees the cleared token and goes to /login?next=<where the user was>
setSessionEndHandler(() => {
  queryClient.clear();
});

export function App() {
  const { t } = useTranslation();
  const [boot, setBoot] = useState<BootResult | null>(null);
  const started = useRef(false);

  const run = useCallback(() => {
    setBoot(null);
    void bootSession().then(setBoot);
  }, []);

  // StrictMode runs effects twice in dev; a second initData login would open a second session
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  if (!boot) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  if (boot.kind === "error") {
    return (
      <FullScreen>
        <h1 className="text-xl font-semibold">{t("auth.bootFailed")}</h1>
        <p className="text-sm text-muted-foreground">{getErrorMessage(boot.error, t("errors.generic"))}</p>
        <Button variant="solid" onClick={run}>
          {t("common.retry")}
        </Button>
      </FullScreen>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
