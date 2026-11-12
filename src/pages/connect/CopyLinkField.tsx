import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useRipple } from "@shared/ui/use-ripple";

import { useCopyLink } from "./use-copy-link";

export function CopyLinkField({
  url,
  caption,
}: {
  url: string;
  /** under the link; "your link" by default */
  caption?: string;
}) {
  const { t } = useTranslation();
  const [copied, copy] = useCopyLink(url);
  const { onPointerDown, ripples } = useRipple();
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={() => void copy()}
      className="group relative isolate flex w-full items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.04] py-2.5 pr-2.5 pl-5 text-left transition-colors hover:bg-white/[0.06]"
    >
      {ripples}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-mono text-xs">{url}</span>
        <span className="text-xs text-muted-foreground">{copied ? t("connect.copied") : (caption ?? t("connect.yourLink"))}</span>
      </span>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          copied ? "text-success" : "text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {copied ? <Check className="size-[18px]" /> : <Copy className="size-[18px]" />}
      </span>
    </button>
  );
}
