declare global {
  interface Window {
    // written by the container entrypoint (public/config.js in dev)
    __CONFIG__?: { apiUrl?: string };
  }
}

export function getApiUrl(): string {
  const url = window.__CONFIG__?.apiUrl?.trim();
  return url ? url.replace(/\/+$/, "") : "/api/v1";
}
