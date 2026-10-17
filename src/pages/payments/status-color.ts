import type { Transaction } from "@entities/transaction/api";

export const STATUS_COLOR: Record<Transaction["status"], string> = {
  PAID: "text-success",
  PENDING: "text-warning",
  FAILED: "text-error",
  CANCELED: "text-muted-foreground",
  REFUNDED: "text-muted-foreground",
};
