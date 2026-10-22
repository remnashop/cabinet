import Markdown from "react-markdown";

import { BottomSheet } from "@shared/ui/BottomSheet";

/** Document text; raw HTML in the Markdown is dropped. */
export function LegalMarkdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&_a]:underline [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">
      <Markdown skipHtml>{children}</Markdown>
    </div>
  );
}

export function LegalDocumentDialog({
  document,
  onClose,
}: {
  document: { title: string; body: string } | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={document !== null} onClose={onClose} title={document?.title ?? ""}>
      {document && <LegalMarkdown>{document.body}</LegalMarkdown>}
    </BottomSheet>
  );
}
