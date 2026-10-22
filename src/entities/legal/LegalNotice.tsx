import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

import { useLegalDocumentsQuery, type LegalKind } from "@entities/legal/api";
import { LegalDocumentDialog } from "@shared/ui/LegalDocumentDialog";

const SLOT = "\u0000";

/** "By continuing you accept [..] and [..]" for the given kinds; nothing when none of them is published. */
export function LegalNotice({ kinds, message }: { kinds: LegalKind[]; message: "loginNotice" | "payNotice" }) {
  const { t } = useTranslation();
  const documents = useLegalDocumentsQuery();
  const [openKind, setOpenKind] = useState<LegalKind | null>(null);
  const shown = kinds.flatMap((kind) => documents.data?.items.find((d) => d.kind === kind) ?? []);
  if (!shown.length) return null;
  const [before, after = ""] = t(`legal.${message}`, { documents: SLOT }).split(SLOT);
  return (
    <>
      <p className="text-center text-[11px] text-muted-foreground">
        {before}
        {shown.map((doc, i) => (
          <Fragment key={doc.kind}>
            {i > 0 && (i === shown.length - 1 ? t("legal.and") : ", ")}
            <button type="button" className="underline" onClick={() => setOpenKind(doc.kind)}>
              {t(`legal.link.${doc.kind}`)}
            </button>
          </Fragment>
        ))}
        {after}
      </p>
      <LegalDocumentDialog document={shown.find((d) => d.kind === openKind) ?? null} onClose={() => setOpenKind(null)} />
    </>
  );
}
