import { useEffect, useRef, useState } from "react";

/** "Copied" for two seconds; a blocked clipboard selects the text node instead, to copy by hand. */
export function useCopyLink(value: string, fallback: () => HTMLElement | null = () => null) {
  const [copied, setCopied] = useState(false);
  // one pending "copied → copy" reset; a re-click restarts it, unmount drops it
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const node = fallback();
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };
  return [copied, copy] as const;
}
