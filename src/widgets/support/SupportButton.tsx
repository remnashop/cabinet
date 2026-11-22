import { Headset } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { useSupport } from "@widgets/support/use-support";

/** "Contact support" (useSupport); nothing when the shop set no way to reach it. main: a message screen's main action,
 *  64px and full width. */
export function SupportButton({ className = "", main = false }: { className?: string; main?: boolean }) {
  const { t } = useTranslation();
  const support = useSupport();
  if (!support.available) return null;
  return (
    <>
      <Button
        variant={main ? "glassSolid" : "glass"}
        size={main ? "lg" : undefined}
        className={main ? `w-full ${className}` : className}
        onClick={support.open}
      >
        <Headset className={main ? "size-5" : "size-4"} />
        {t("help.contactSupport")}
      </Button>
      {support.dialog}
    </>
  );
}
