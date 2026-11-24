import { useState, type ReactNode } from "react";

import { emojiThumbnailUrl } from "./api";

interface PlanIconProps {
  id: string | null | undefined;
  glyph: string | null | undefined;
  // sizes it, as a lucide icon's
  className: string;
  fallback: ReactNode;
}

/** The emoji the shop picked for a plan, as the pack's static thumbnail; its glyph if that won't load,
    `fallback` when the plan has none. */
export function PlanIcon({ id, glyph, className, fallback }: PlanIconProps) {
  const [failed, setFailed] = useState(false);
  if (!id) return fallback;
  if (failed) {
    if (!glyph) return fallback;
    return <span className={`flex items-center justify-center leading-none ${className}`}>{glyph}</span>;
  }
  return (
    <img
      src={emojiThumbnailUrl(id)}
      alt={glyph ?? ""}
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
