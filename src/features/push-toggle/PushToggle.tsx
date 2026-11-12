import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { pushApi, usePushConfiguredQuery } from "@entities/notification/api";
import { getErrorMessage } from "@shared/api/http";
import { currentPushEndpoint, detectPushSupport, disablePush, enablePush } from "@shared/lib/push";
import { isMiniApp } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { EventIcon, EventList, EventRow } from "@shared/ui/EventList";
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
        <EventList>
          <EventRow
            icon={<EventIcon icon={BellRing} />}
            title={t("push.title")}
            caption={note ?? (on === null ? undefined : on ? t("push.on") : t("push.off"))}
            aside={
              !note &&
              on !== null && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={toggle}>
                  {on ? t("push.disable") : t("push.enable")}
                </Button>
              )
            }
          />
        </EventList>
      </Card>
      {problem && <FormError className="px-5 lg:px-4">{problem}</FormError>}
    </div>
  );
}
