const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const rounded = exponent === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${UNITS[exponent]}`;
}

export function daysLeft(expireAtIso: string, now: Date = new Date()): number {
  const diffMs = new Date(expireAtIso).getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}
