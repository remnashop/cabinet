import { useMutation } from "@tanstack/react-query";
import { MonitorX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { revokeOtherSessions } from "@features/auth/api";
import { getErrorMessage } from "@shared/api/http";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { SuccessMessage } from "@shared/ui/SuccessCheck";

/** "Sign out on all other devices?", then the done notice. */
export function SignOutOthersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const revoke = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => {
      onClose();
      setDone(true);
    },
  });
  const close = () => {
    revoke.reset();
    onClose();
  };
  return (
    <>
      <ConfirmSheet
        open={open}
        title={t("signOut.othersTitle")}
        text={t("signOut.othersText")}
        confirmLabel={t("signOut.others")}
        danger
        icon={MonitorX}
        pending={revoke.isPending}
        onConfirm={() => revoke.mutate()}
        error={revoke.isError ? getErrorMessage(revoke.error, t("errors.generic")) : null}
        onClose={close}
      />
      <BottomSheet narrow bare icon={MonitorX} open={done} onClose={() => setDone(false)} title={t("signOut.others")}>
        <SuccessMessage>{t("signOut.othersDone")}</SuccessMessage>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => setDone(false)}>
          {t("common.continue")}
        </Button>
      </BottomSheet>
    </>
  );
}
