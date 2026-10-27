import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
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
import { Button } from "@shared/ui/Button";
import { LegalDocumentDialog } from "@shared/ui/LegalDocumentDialog";

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-3xl">
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-dialog border border-white/[0.14] bg-popover/60 p-6 shadow-[0_24px_48px_-20px_rgba(4,8,20,0.6),inset_0_1px_0_rgba(232,236,251,0.16)] backdrop-blur-2xl backdrop-saturate-150">
        <div className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
          <FileText className="size-[18px]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("legal.reaccept.title")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("legal.reaccept.text")}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {items.map((doc) => (
            <button
              key={doc.kind}
              type="button"
              onClick={() => setOpen(doc)}
              className="flex h-11 items-center justify-between gap-3 rounded-full border border-border bg-input/60 px-3.5 text-left text-sm text-foreground transition-colors hover:bg-white/5"
            >
              <span className="min-w-0 truncate">{doc.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("legal.reaccept.revision", { date: formatDate(doc.created_at, i18n.language) })}
              </span>
            </button>
          ))}
        </div>
        {error && <p className="text-[13px] text-error">{error}</p>}
        <div className="flex justify-between gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void logout().then(() => queryClient.clear())}>
            {t("common.logout")}
          </Button>
          <Button variant="solid" disabled={busy} onClick={() => void accept()}>
            {busy ? t("legal.reaccept.accepting") : t("legal.reaccept.accept")}
          </Button>
        </div>
      </div>
      <LegalDocumentDialog document={open} onClose={() => setOpen(null)} />
    </div>
  );
}
