import { BellRing } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { pushApi, usePushConfiguredQuery } from "@entities/notification/api";
import { detectPushSupport, enablePush } from "@shared/lib/push";
import { isMiniApp } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { IconCircle } from "@shared/ui/IconCircle";
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
        {/* the card's own 20px padding; a list row inside it would add its own on top */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <IconCircle icon={BellRing} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-foreground">{t("pushPrompt.title")}</span>
              <span className="text-xs text-muted-foreground">{t("pushPrompt.text")}</span>
            </span>
          </div>
          {/* on a phone under the text, the full width: beside it they left the title a few letters wide */}
          <div className="grid grid-cols-2 gap-1.5 lg:flex">
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
            <Button variant="glassAccent" size="sm" disabled={phase === "busy"} onClick={() => void enable()}>
              {t("push.enable")}
            </Button>
          </div>
        </div>
      </Card>
      {phase === "failed" && <FormError className="px-5 lg:px-4">{t("push.failed")}</FormError>}
    </div>
  );
}
