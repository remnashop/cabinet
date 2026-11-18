import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { pushApi, usePushConfiguredQuery } from "@entities/notification/api";
import { getErrorMessage } from "@shared/api/http";
import { currentPushEndpoint, detectPushSupport, disablePush, enablePush } from "@shared/lib/push";
import { isMiniApp } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { IconCircle } from "@shared/ui/IconCircle";
import { FormError } from "@shared/ui/FormError";

/** The profile's row: push on this device. "On" is a live subscription plus a granted permission. */
export function PushToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const support = detectPushSupport();
  const miniApp = isMiniApp();
  const configured = usePushConfiguredQuery();

  const refresh = () =>
    currentPushEndpoint().then((endpoint) => setOn(endpoint !== null && Notification.permission === "granted"));
  useEffect(() => {
    if (miniApp || support !== "ready") return;
    void currentPushEndpoint().then((endpoint) => setOn(endpoint !== null && Notification.permission === "granted"));
  }, [miniApp, support]);

  // the Mini App gets its notifications from the bot; with no VAPID key on the backend there's nothing to offer (and
  // nothing shows until that's known, so the row doesn't flash in and out)
  if (miniApp || configured.data !== true) return null;

  const denied = support === "ready" && Notification.permission === "denied";
  const note =
    support === "unsupported"
      ? t("push.unsupported")
      : support === "ios-needs-install"
        ? t("push.iosInstall")
        : denied
          ? t("push.denied")
          : null;

  const caption = note ?? (on === null ? undefined : on ? t("push.on") : t("push.off"));

  const toggle = async () => {
    setBusy(true);
    setProblem(null);
    try {
      if (on) {
        await disablePush(pushApi, { optOut: true });
      } else {
        const result = await enablePush(pushApi);
        if (result === "not-configured") setProblem(t("push.notConfigured"));
        else if (result === "failed") setProblem(t("push.failed"));
      }
    } catch (error) {
      setProblem(getErrorMessage(error, t("push.failed")));
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Card round>
        {/* the card's own 20px padding; a list row inside it would add its own on top */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <IconCircle icon={BellRing} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-foreground">{t("push.title")}</span>
              {caption !== undefined && <span className="text-xs text-muted-foreground">{caption}</span>}
            </span>
          </div>
          {/* on a phone under the text, the full width, as the home page's push prompt */}
          {!note && on !== null && (
            <Button variant="secondary" size="sm" className="w-full lg:w-auto" disabled={busy} onClick={toggle}>
              {on ? t("push.disable") : t("push.enable")}
            </Button>
          )}
        </div>
      </Card>
      {problem && <FormError className="px-5 lg:px-4">{problem}</FormError>}
    </div>
  );
}
