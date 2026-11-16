import { useState, type ReactNode } from "react";

import { API_BASE } from "@shared/api/http";

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
      src={`${API_BASE}/emoji-packs/thumbnails/${encodeURIComponent(id)}`}
      alt={glyph ?? ""}
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
