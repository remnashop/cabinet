import { useSyncExternalStore } from "react";

export interface AccessToken {
  access_token: string;
  expires_in: number;
}

// memory only: the refresh token is an httponly cookie the page never sees
let accessToken: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAccessToken(token: AccessToken): void {
  accessToken = token.access_token;
  emit();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
  emit();
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, () => accessToken !== null);
}
