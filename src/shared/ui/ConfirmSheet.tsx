import { TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { BottomSheet } from "@shared/ui/BottomSheet";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  /** the header's circle, as the other dialogs'; a warning sign by default */
  icon?: LucideIcon;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}

/** A yes/no question in the panel's centred dialog: the mark in the header, what it means, cancel and the action. */
export function ConfirmSheet({
  open,
  title,
  text,
  confirmLabel,
  danger,
  icon = TriangleAlert,
  onConfirm,
  onClose,
  pending,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheet
      narrow
      icon={icon}
      iconTone={danger ? "danger" : "glass"}
      open={open}
      onClose={onClose}
      title={title}
    >
      <p className="text-sm text-muted-foreground">{text}</p>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant={danger ? "danger" : "accent"} className="flex-1" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
