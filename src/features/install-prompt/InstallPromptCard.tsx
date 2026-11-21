import { EllipsisVertical, Share, SquarePlus, Smartphone, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { IconCircle } from "@shared/ui/IconCircle";
import { DialogFooter, Modal } from "@shared/ui/Modal";

import { installPromptPlatform, recordInstallPrompt, type InstallPlatform } from "./install-prompt";

const STEPS = {
  ios: [
    [Share, "installPrompt.ios.step1"],
    [SquarePlus, "installPrompt.ios.step2"],
  ],
  android: [
    [EllipsisVertical, "installPrompt.android.step1"],
    [SquarePlus, "installPrompt.android.step2"],
  ],
} as const satisfies Record<InstallPlatform, readonly (readonly [LucideIcon, string])[]>;

/** The offer to put the cabinet on the phone's home screen, with a guide for the browser it's in. */
export function InstallPromptCard() {
  const { t } = useTranslation();
  // fixed for the mount: the card doesn't come and go while it's read
  const [platform] = useState(installPromptPlatform);
  const [phase, setPhase] = useState<"offer" | "guide" | "closed">("offer");

  if (!platform || phase === "closed") return null;

  const close = () => {
    recordInstallPrompt();
    setPhase("closed");
  };

  return (
    <div className="mt-5 flex flex-col gap-2">
      <Card round>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <IconCircle icon={Smartphone} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-foreground">{t("installPrompt.title")}</span>
              <span className="text-xs text-muted-foreground">{t("installPrompt.text")}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 lg:flex">
            <Button variant="secondary" size="sm" onClick={close}>
              {t("installPrompt.later")}
            </Button>
            <Button variant="glassAccent" size="sm" onClick={() => setPhase("guide")}>
              {t("installPrompt.how")}
            </Button>
          </div>
        </div>
      </Card>
      <Modal open={phase === "guide"} onClose={close} title={t("installPrompt.title")} icon={Smartphone} narrow>
        <ol className="flex flex-col gap-3">
          {STEPS[platform].map(([Icon, key]) => (
            <li key={key} className="flex items-center gap-3">
              <IconCircle icon={Icon} />
              <span className="text-sm text-foreground">{t(key)}</span>
            </li>
          ))}
        </ol>
        {platform === "ios" && <p className="mt-3 text-xs text-muted-foreground">{t("installPrompt.ios.push")}</p>}
        <DialogFooter>
          <Button variant="glassAccent" onClick={close}>
            {t("installPrompt.done")}
          </Button>
        </DialogFooter>
      </Modal>
    </div>
  );
}
