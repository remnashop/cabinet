import { useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@shared/api/http";

import { linkDigest, type Hop } from "./lib";

export type PlatformId = "ios" | "android" | "windows" | "macos" | "linux" | "androidtv" | "appletv";
export type StepIcon = "download" | "plus" | "power" | "settings" | "check" | "link" | "qr" | "info" | "shield" | "globe";

/** locale → text */
export type LocalizedText = Record<string, string>;

export type ConnectButton =
  | { kind: "external"; label: LocalizedText; url: string }
  | { kind: "deep_link"; label: LocalizedText; template: string; encode: "raw" | "component" }
  | { kind: "copy_link"; label: LocalizedText };

export interface ConnectStep {
  title: LocalizedText;
  body: LocalizedText | null;
  icon: StepIcon;
  buttons: ConnectButton[];
}

export interface ConnectApp {
  id: string;
  name: string;
  featured: boolean;
  steps: ConnectStep[];
}

export interface ConnectPlatform {
  id: PlatformId;
  apps: ConnectApp[];
}

export interface ConnectGuide {
  // empty while the guide is off in the dashboard
  platforms: ConnectPlatform[];
}

/** Zero-session: the page a Mini App deep link opens in the browser reads it too. */
export function useConnectGuideQuery() {
  return useQuery({
    queryKey: ["connect-guide"],
    queryFn: ({ signal }) => apiGet<ConnectGuide>("/shop/connect-guide", signal),
    staleTime: 5 * 60_000,
  });
}

/** Zero-session too: whether the backend signed the hop's subscription link. Sends its digest, not the link. */
export function useVerifyHopQuery(hop: Hop | null) {
  return useQuery({
    queryKey: ["connect-hop", hop?.sig],
    queryFn: async ({ signal }) =>
      apiPost<{ valid: boolean }, { digest: string; signature: string }>(
        "/shop/connect-guide/verify",
        { digest: await linkDigest(hop!.sub), signature: hop!.sig },
        signal,
      ),
    enabled: hop !== null,
    staleTime: Infinity,
  });
}
