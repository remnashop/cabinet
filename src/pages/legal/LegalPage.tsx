import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useLegalDocumentsQuery } from "@entities/legal/api";
import { getErrorMessage } from "@shared/api/http";
import { Card } from "@shared/ui/Card";
import { LegalMarkdown } from "@shared/ui/LegalDocumentDialog";
import { Spinner } from "@shared/ui/Spinner";

export function LegalPage() {
  const { t } = useTranslation();
  const { kind } = useParams();
  const documents = useLegalDocumentsQuery();
  const wanted = kind?.toUpperCase().replaceAll("-", "_");
  const shown = documents.data?.items.filter((d) => !wanted || d.kind === wanted) ?? [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <Link to="/" className="text-sm text-muted-foreground underline">
        {t("common.home")}
      </Link>
      {documents.isPending && <Spinner size="card" />}
      {documents.isError && <p className="text-sm text-error">{getErrorMessage(documents.error, t("errors.generic"))}</p>}
      {documents.isSuccess && !shown.length && <p className="text-sm text-muted-foreground">{t("legal.empty")}</p>}
      {shown.map((doc) => (
        <Card key={doc.kind}>
          <h2 className="mb-3 text-lg font-semibold">{doc.title}</h2>
          <LegalMarkdown>{doc.body}</LegalMarkdown>
        </Card>
      ))}
    </main>
  );
}
