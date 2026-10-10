import { useSyncExternalStore } from "react";

import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// The cabinet may live on another domain than the API, so the refresh token
// can't be a cookie; the short-lived access token stays in memory only.
const REFRESH_KEY = "cabinet_refresh_token";

let accessToken: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTokens(tokens: Tokens): void {
  accessToken = tokens.access_token;
  writeStorage(REFRESH_KEY, tokens.refresh_token);
  emit();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_KEY);
}

export function clearTokens(): void {
  accessToken = null;
  removeStorage(REFRESH_KEY);
  emit();
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, () => accessToken !== null);
}
