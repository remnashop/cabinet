import { TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { Modal, DialogFooter } from "@shared/ui/Modal";

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
  /** why the action failed, said under the text while the sheet stays open */
  error?: string | null;
}

/** A yes/no question, the panel's ConfirmDialog: the mark in the header, what it means, cancel and the action in the footer. */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  danger,
  icon = TriangleAlert,
  onConfirm,
  onClose,
  pending,
  error,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  return (
    <Modal
      narrow
      // a destructive question always shows the warning sign, as the panel's ConfirmDialog
      icon={danger ? TriangleAlert : icon}
      iconTone={danger ? "danger" : "glass"}
      open={open}
      onClose={onClose}
      title={title}
    >
      <p className="whitespace-pre-line text-sm text-foreground/80">{text}</p>
      {error && <p className="mt-3 text-xs text-error">{error}</p>}
      <DialogFooter>
        <Button variant="glass" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant={danger ? "glassDanger" : "glassAccent"} disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Modal>
  );
}
