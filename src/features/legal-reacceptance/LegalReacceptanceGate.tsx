import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  acceptLegal,
  legalLocale,
  PENDING_LEGAL_KEY,
  usePendingLegalQuery,
  type LegalDocument,
} from "@entities/legal/api";
import { logout } from "@features/auth/logout";
import { getErrorMessage } from "@shared/api/http";
import { formatDate } from "@shared/lib/format";
import { Modal, DialogFooter } from "@shared/ui/Modal";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { FormError } from "@shared/ui/FormError";
import { LegalDocumentDialog } from "@shared/ui/LegalDocumentDialog";
import { isMiniApp } from "@shared/telegram";

/** Blocks the cabinet until the customer accepts documents an admin asked to accept again; only sign-out leaves it. */
export function LegalReacceptanceGate() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const pending = usePendingLegalQuery();
  const [open, setOpen] = useState<LegalDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = pending.data?.items ?? [];
  if (!items.length) return null;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await acceptLegal(items.map((doc) => doc.revision_id));
      queryClient.setQueryData([PENDING_LEGAL_KEY, legalLocale()], next);
    } catch (err) {
      setError(getErrorMessage(err, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        narrow
        fullScreen
        icon={FileText}
        open
        title={t("legal.reaccept.title")}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground/80">{t("legal.reaccept.text")}</p>
          <Card variant="list">
            {items.map((doc) => (
              <InfoRow
                key={doc.kind}
                icon={FileText}
                label={doc.title}
                value={
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    {t("legal.reaccept.revision", { date: formatDate(doc.created_at, i18n.language) })}
                    <ChevronRight className="size-4" />
                  </span>
                }
                onClick={() => setOpen(doc)}
              />
            ))}
          </Card>
          {error && <FormError>{error}</FormError>}
        </div>
        <DialogFooter>
          {/* the Mini App would sign straight back in and land here again: no sign-out there */}
          {!isMiniApp() && (
            <Button variant="glass" onClick={() => void logout().then(() => queryClient.clear())}>
              {t("common.logout")}
            </Button>
          )}
          <Button variant="glassAccent" disabled={busy} onClick={() => void accept()}>
            {t("legal.reaccept.accept")}
          </Button>
        </DialogFooter>
      </Modal>
      <LegalDocumentDialog document={open} onClose={() => setOpen(null)} />
    </>
  );
}
