import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { useSignOut } from "@widgets/app-shell/sign-out";

/** "Sign out?" before the profile's button and the header menu's item do it. */
export function SignOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const signOut = useSignOut();
  return (
    <ConfirmSheet
      open={open}
      title={t("signOut.title")}
      text={t("signOut.text")}
      confirmLabel={t("common.logout")}
      danger
      icon={LogOut}
      onConfirm={() => {
        onClose();
        signOut();
      }}
      onClose={onClose}
    />
  );
}
