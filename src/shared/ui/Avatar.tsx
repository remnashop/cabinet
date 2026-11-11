import { User } from "lucide-react";
import { useState } from "react";

import { getTelegramPhotoUrl } from "@shared/telegram";

/**
 * The user in a circle: their Telegram photo inside the Mini App, else the name's first letter (no name, an icon).
 * A photo that fails to load falls back to the letter. className: size and type size only.
 */
export function Avatar({ name, className }: { name: string | undefined; className: string }) {
  const [photo] = useState(getTelegramPhotoUrl);
  const [failed, setFailed] = useState(false);
  const letter = name?.trim()[0]?.toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full glass-control font-semibold text-foreground ${className}`}
    >
      {photo && !failed ? (
        <img src={photo} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        (letter ?? <User className="size-4" />)
      )}
    </span>
  );
}
