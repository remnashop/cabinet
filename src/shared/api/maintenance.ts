import { useSyncExternalStore } from "react";

// the backend answered ACCESS_RESTRICTED: the admin closed the service, nothing else works until it opens
let closed = false;
const listeners = new Set<() => void>();

export function markServiceClosed(): void {
  if (closed) return;
  closed = true;
  for (const listener of listeners) listener();
}

export function isServiceClosed(): boolean {
  return closed;
}

export function useServiceClosed(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isServiceClosed,
  );
}
