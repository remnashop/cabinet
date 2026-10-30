import { useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@shared/api/http";
import i18n from "@shared/i18n";

export type LegalKind = "OFFER" | "USER_AGREEMENT" | "PRIVACY_POLICY";

export interface LegalDocument {
  kind: LegalKind;
  title: string;
  // Markdown
  body: string;
  revision_id: number;
}

/** The UI language as the backend records it with a sign-in or an order. */
export function legalLocale(): string {
  return i18n.language.startsWith("ru") ? "ru" : "en";
}

export function useLegalDocumentsQuery() {
  const locale = legalLocale();
  return useQuery({
    queryKey: ["legal-documents", locale],
    queryFn: ({ signal }) =>
      apiGet<{ items: LegalDocument[]; total: number }>(`/legal/documents?locale=${locale}`, signal),
  });
}

/** False once the documents are in and none is published: nothing to open, so no way in to them. While they load
 *  or fail, true: the dialog shows the wait or the error. */
export function useHasLegalDocuments(): boolean {
  const documents = useLegalDocumentsQuery();
  return !documents.isSuccess || documents.data.items.length > 0;
}

/** The locale to send with a sign-in or order: only once the notice could be shown (documents loaded). */
export function useShownLegalLocale(): string | undefined {
  return useLegalDocumentsQuery().isSuccess ? legalLocale() : undefined;
}

export interface PendingLegalDocument extends LegalDocument {
  created_at: string;
}

export interface PendingLegal {
  items: PendingLegalDocument[];
  total: number;
  // every document was accepted before: an update, not a first acceptance
  is_update: boolean;
}

export const PENDING_LEGAL_KEY = "legal-pending";

/** Documents an admin asked the customer to accept again. */
export function usePendingLegalQuery() {
  const locale = legalLocale();
  return useQuery({
    queryKey: [PENDING_LEGAL_KEY, locale],
    queryFn: ({ signal }) => apiGet<PendingLegal>(`/cabinet/legal/pending?locale=${locale}`, signal),
  });
}

/** Answers what is still pending: empty once accepted, a fresh revision when one was saved meanwhile. */
export function acceptLegal(revisionIds: number[]): Promise<PendingLegal> {
  return apiPost<PendingLegal, { locale: string; revision_ids: number[] }>("/cabinet/legal/actions/accept", {
    locale: legalLocale(),
    revision_ids: revisionIds,
  });
}
