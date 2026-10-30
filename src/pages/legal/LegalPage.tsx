import { ChevronLeft, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useLegalDocumentsQuery } from "@entities/legal/api";
import { useIsAuthenticated } from "@shared/api/tokens";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { LegalMarkdown } from "@shared/ui/LegalDocumentDialog";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

/** The published documents. Signed in, a page of the shell (its nav, back home); a guest gets it on its own, back to
 *  sign-in both in the title row and in the bottom nav's place. */
export function LegalPage() {
  const { t } = useTranslation();
  const authed = useIsAuthenticated();
  const { kind } = useParams();
  const documents = useLegalDocumentsQuery();
  const wanted = kind?.toUpperCase().replaceAll("-", "_");
  const shown = documents.data?.items.filter((d) => !wanted || d.kind === wanted) ?? [];

  const content = (
    <>
      <PageHeader title={t("help.documents")} backTo={authed ? "/" : "/login"} />
      {documents.isPending && <Skeleton className="h-64" />}
      {documents.isError && !documents.data && <ErrorCard error={documents.error} onRetry={() => void documents.refetch()} />}
      {documents.isSuccess && !shown.length && <PageEmpty icon={FileText} text={t("legal.empty")} />}
      {shown.map((doc) => (
        <Card key={doc.kind}>
          <h2 className="mb-3 text-base font-bold">{doc.title}</h2>
          <LegalMarkdown>{doc.body}</LegalMarkdown>
        </Card>
      ))}
    </>
  );
  if (authed) return <div className="flex flex-col gap-4">{content}</div>;

  return (
    <>
      {/* the bottom padding clears the 64px back capsule with 16px on both sides, as main's does the nav */}
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-[calc(var(--safe-top)+16px)] pb-[calc(max(var(--safe-bottom),16px)+80px)]">
        {content}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl px-4 pb-[max(var(--safe-bottom),16px)]">
        <Link
          to="/login"
          replace
          className="flex h-16 w-full items-center justify-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.06] text-sm font-medium text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(232,236,251,0.22)] backdrop-blur-md backdrop-saturate-[1.8] transition-colors hover:bg-white/[0.1]"
        >
          <ChevronLeft className="size-5" />
          {t("legal.goBack")}
        </Link>
      </div>
    </>
  );
}
