import { BellRing } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { pushApi, usePushConfiguredQuery } from "@entities/notification/api";
import { detectPushSupport, enablePush } from "@shared/lib/push";
import { isMiniApp } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { EventIcon, EventList, EventRow } from "@shared/ui/EventList";
import { FormError } from "@shared/ui/FormError";

import { isPushPromptEligible, recordPushPrompt, wasPushPromptAnswered } from "./push-prompt";

/**
 * The offer to turn push on, inline on the home page right after a purchase or a trial (reiwa's PushPromptCard).
 * Every condition is read before it shows, so a tap on Enable reaches Notification.requestPermission() with no
 * await in between: one made after a network call is outside the tap's activation, and browsers drop it. Answered
 * once per browser, whatever the answer; the profile's row stays for a change of mind.
 */
export function PushPromptCard() {
  const { t } = useTranslation();
  // fixed for the mount: the card doesn't come and go while it's read
  const [eligible] = useState(
    () =>
      !isMiniApp() &&
      detectPushSupport() === "ready" &&
      Notification.permission === "default" &&
      isPushPromptEligible() &&
      !wasPushPromptAnswered(),
  );
  const configured = usePushConfiguredQuery(eligible);
  const [phase, setPhase] = useState<"offer" | "busy" | "failed" | "closed">("offer");
  const visible = eligible && configured.data === true;

  if (!visible || phase === "closed") return null;

  const enable = async () => {
    setPhase("busy");
    try {
      const result = await enablePush(pushApi);
      recordPushPrompt(result === "subscribed" ? "accepted" : result === "not-configured" ? "failed" : result);
      setPhase(result === "failed" ? "failed" : "closed");
    } catch {
      recordPushPrompt("failed");
      setPhase("failed");
    }
  };

  return (
    <div className="mt-5 flex flex-col gap-2">
      <Card round>
        <EventList>
          <EventRow
            icon={<EventIcon icon={BellRing} />}
            title={t("pushPrompt.title")}
            caption={t("pushPrompt.text")}
            aside={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    recordPushPrompt("dismissed");
                    setPhase("closed");
                  }}
                >
                  {t("pushPrompt.later")}
                </Button>
                <Button variant="accent" size="sm" disabled={phase === "busy"} onClick={() => void enable()}>
                  {t("push.enable")}
                </Button>
              </>
            }
          />
        </EventList>
      </Card>
      {phase === "failed" && <FormError className="px-5 lg:px-4">{t("push.failed")}</FormError>}
    </div>
  );
}
