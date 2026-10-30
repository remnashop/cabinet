import { ChevronRight, FileText, Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useLegalDocumentsQuery, type LegalDocument } from "@entities/legal/api";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { InfoRow } from "@shared/ui/InfoRow";
import { LegalDocumentDialog } from "@shared/ui/LegalDocumentDialog";
import { Skeleton } from "@shared/ui/Skeleton";

/** Service information: the legal documents, as the bot's "Documents" button. */
export function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const documents = useLegalDocumentsQuery();
  const [reading, setReading] = useState<LegalDocument | null>(null);
  const items = documents.data?.items ?? [];

  return (
    <>
      <BottomSheet narrow fullScreen icon={Info} open={open} onClose={onClose} title={t("help.info")}>
        {documents.isPending ? (
          <Skeleton className="h-28" />
        ) : documents.isError && !documents.data ? (
          <ErrorCard error={documents.error} onRetry={() => void documents.refetch()} />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("legal.empty")}</p>
        ) : (
          <Card variant="list" title={t("help.documents")}>
            {items.map((document) => (
              <InfoRow
                key={document.kind}
                icon={FileText}
                label={document.title}
                value={<ChevronRight className="size-4 text-muted-foreground" />}
                onClick={() => {
                  onClose();
                  setReading(document);
                }}
              />
            ))}
          </Card>
        )}
      </BottomSheet>
      <LegalDocumentDialog document={reading} onClose={() => setReading(null)} />
    </>
  );
}
