import type { Transaction } from "@entities/transaction/api";
import type { BadgeTone } from "@shared/ui/Badge";

/** The panel's PAYMENT_STATUS_BADGE_TONE: a refund is the accent, not a muted cancel. */
export const STATUS_TONE: Record<Transaction["status"], BadgeTone> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  CANCELED: "neutral",
  REFUNDED: "accent",
};

/** The list shows the status as its currency circle's colour; the badge is for the details. */
export const STATUS_ICON_TONE: Record<Transaction["status"], string> = {
  PAID: "bg-success/15 text-success",
  PENDING: "bg-warning/15 text-warning",
  FAILED: "bg-error/15 text-error",
  CANCELED: "bg-white/[0.06] text-muted-foreground",
  REFUNDED: "bg-accent text-primary",
};
