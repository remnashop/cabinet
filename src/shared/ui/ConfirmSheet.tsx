import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { BottomSheet } from "@shared/ui/BottomSheet";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}

export function ConfirmSheet({
  open,
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  pending,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-muted-foreground">{text}</p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant={danger ? "danger" : "solid"} className="flex-1" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
