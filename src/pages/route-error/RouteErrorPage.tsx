import { TriangleAlert } from "lucide-react";
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
    <FullScreenMessage icon={TriangleAlert} title={t("errors.pageTitle")} text={stale ? t("errors.newVersion") : t("errors.generic")}>
      <Button variant="solid" className="w-full" onClick={() => window.location.reload()}>
        {t("common.reload")}
      </Button>
    </FullScreenMessage>
  );
}
