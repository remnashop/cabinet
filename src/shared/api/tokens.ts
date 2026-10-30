import { useSyncExternalStore } from "react";

export interface AccessToken {
  access_token: string;
  expires_in: number;
}

// memory only: the refresh token is an httponly cookie the page never sees
let accessToken: string | null = null;
// the server ended the session (not a sign-out): the login screen says why it's there
let sessionExpired = false;
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
  sessionExpired = false;
  emit();
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** expired: the server ended the session, as opposed to the user signing out */
export function clearAccessToken(expired = false): void {
  accessToken = null;
  sessionExpired = expired;
  emit();
}

export function wasSessionExpired(): boolean {
  return sessionExpired;
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, () => accessToken !== null);
}
