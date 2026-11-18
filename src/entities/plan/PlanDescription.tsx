import { useState, type ReactNode } from "react";

import { emojiThumbnailUrl } from "./api";

// Telegram's premium emoji markup, as the backend writes it
const PREMIUM_EMOJI_RE = /\[([^[\]]{1,16})\]\(emoji:(\d{1,24})\)/g;

/** A plan's description with each premium emoji drawn as its pack's static thumbnail. */
export function PlanDescription({ markup }: { markup: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of markup.matchAll(PREMIUM_EMOJI_RE)) {
    parts.push(markup.slice(last, match.index));
    parts.push(<InlineEmoji key={match.index} id={match[2]} glyph={match[1]} />);
    last = match.index + match[0].length;
  }
  parts.push(markup.slice(last));
  return <>{parts}</>;
}

function InlineEmoji({ id, glyph }: { id: string; glyph: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return glyph;
  return (
    <img
      src={emojiThumbnailUrl(id)}
      alt={glyph}
      draggable={false}
      onError={() => setFailed(true)}
      className="inline-block size-[1.25em] object-contain align-[-0.3em]"
    />
  );
}
