import { useSyncExternalStore } from "react";

import { readStorage, writeStorage } from "@shared/lib/safe-storage";

// Per-viewer "icons only" sidebar on desktop, as the panel's; below xl the sidebar is an icon rail regardless.
const STORAGE_KEY = "cabinet_sidebar_collapsed";

const listeners = new Set<() => void>();
let collapsed = readStorage(STORAGE_KEY) === "1";

export function toggleSidebarCollapsed(): void {
  collapsed = !collapsed;
  writeStorage(STORAGE_KEY, collapsed ? "1" : "0");
  listeners.forEach((listener) => listener());
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => collapsed,
  );
}
