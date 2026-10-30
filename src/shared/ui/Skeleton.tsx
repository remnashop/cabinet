export function Skeleton({ round, className = "" }: { round?: boolean; className?: string }) {
  return <div className={`motion-safe:animate-pulse ${round ? "rounded-home" : "rounded-2xl"} bg-white/[0.06] ${className}`} />;
}
