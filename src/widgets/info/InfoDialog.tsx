import { ChevronRight, FileText, Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useLegalDocumentsQuery, type LegalDocument } from "@entities/legal/api";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { InfoRow } from "@shared/ui/InfoRow";
import { LegalMarkdown } from "@shared/ui/LegalDocumentDialog";
import { Skeleton } from "@shared/ui/Skeleton";

/** Service information: the legal documents, as the bot's "Documents" button. A document opens in the same sheet, so
 *  the backdrop stays put rather than fading out with the list and back in with the document. */
export function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const documents = useLegalDocumentsQuery();
  const [reading, setReading] = useState<LegalDocument | null>(null);
  const items = documents.data?.items ?? [];
  const close = () => {
    onClose();
    setReading(null);
  };

  return reading ? (
    <BottomSheet fullScreen view="document" open={open} onClose={close} title={reading.title}>
      <LegalMarkdown>{reading.body}</LegalMarkdown>
    </BottomSheet>
  ) : (
    <BottomSheet narrow cards fullScreen view="list" icon={Info} open={open} onClose={close} title={t("help.info")}>
      {documents.isPending ? (
        <Skeleton className="h-28" />
      ) : documents.isError && !documents.data ? (
        <ErrorCard error={documents.error} onRetry={() => void documents.refetch()} />
      ) : items.length === 0 ? (
        <p className="p-1 text-sm text-foreground/80">{t("legal.empty")}</p>
      ) : (
        <Card variant="list" title={t("help.documents")}>
          {items.map((document) => (
            <InfoRow
              key={document.kind}
              icon={FileText}
              label={document.title}
              value={<ChevronRight className="size-4 text-muted-foreground" />}
              onClick={() => setReading(document)}
            />
          ))}
        </Card>
      )}
    </BottomSheet>
  );
}
