import Markdown from "react-markdown";

import { Modal } from "@shared/ui/Modal";

/** Document text; raw HTML in the Markdown is dropped. */
export function LegalMarkdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&_a]:underline [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">
      <Markdown skipHtml>{children}</Markdown>
    </div>
  );
}

/** Text kept exactly as stored, line breaks included: what a customer consented to. */
export function PlainText({ children }: { children: string }) {
  return <p className="whitespace-pre-line text-sm leading-relaxed">{children}</p>;
}

export function LegalDocumentDialog({
  document,
  onClose,
  plain = false,
}: {
  document: { title: string; body: string } | null;
  onClose: () => void;
  /** the body is plain text, not Markdown */
  plain?: boolean;
}) {
  return (
    <Modal fullScreen open={document !== null} onClose={onClose} title={document?.title ?? ""}>
      {document && (plain ? <PlainText>{document.body}</PlainText> : <LegalMarkdown>{document.body}</LegalMarkdown>)}
    </Modal>
  );
}
