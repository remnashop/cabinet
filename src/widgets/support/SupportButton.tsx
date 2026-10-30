import { Headset } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { useSupport } from "@widgets/support/use-support";

/** "Contact support" (useSupport); nothing when the shop set no way to reach it. */
export function SupportButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const support = useSupport();
  if (!support.available) return null;
  return (
    <>
      <Button variant="outline" className={className} onClick={support.open}>
        <Headset className="size-4" />
        {t("help.contactSupport")}
      </Button>
      {support.dialog}
    </>
  );
}
