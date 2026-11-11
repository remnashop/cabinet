import { useSurface } from "./surface";

/** corners: a placeholder for something other than a card (a QR, a link field), in place of the card's */
export function Skeleton({ round, corners, className = "" }: { round?: boolean; corners?: string; className?: string }) {
  const { shape } = useSurface(round);
  return <div className={`motion-safe:animate-pulse ${corners ?? shape} bg-white/[0.06] ${className}`} />;
}
