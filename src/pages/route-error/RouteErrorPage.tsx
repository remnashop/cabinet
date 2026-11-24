import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router";

import { readStorage, writeStorage } from "@shared/lib/safe-storage";
import { Button } from "@shared/ui/Button";
import { FullScreenMessage } from "@widgets/full-screen/FullScreen";

import { isStaleChunkError } from "./stale-chunk";

const RELOADED_KEY = "cabinet_chunk_reload";

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const stale = isStaleChunkError(error);
  // one reload a session picks up the new build by itself; failing again after it, the screen stays
  const reloading = stale && readStorage(RELOADED_KEY, "session") === null;

  useEffect(() => {
    if (!reloading) return;
    writeStorage(RELOADED_KEY, "1", "session");
    window.location.reload();
  }, [reloading]);

  if (reloading) return null;
  return (
    <FullScreenMessage
      tone="error"
      art={
        stale ? (
          <span className="flex size-16 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.06] text-muted-foreground">
            <RefreshCw className="size-7" />
          </span>
        ) : undefined
      }
      title={t(stale ? "errors.newVersionTitle" : "errors.pageTitle")}
      text={t(stale ? "errors.newVersion" : "errors.generic")}
    >
      <Button variant="glassSolid" size="lg" className="w-full" onClick={() => window.location.reload()}>
        <RefreshCw className="size-5" />
        {t("common.reload")}
      </Button>
    </FullScreenMessage>
  );
}
