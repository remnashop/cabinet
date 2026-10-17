import { useQuery } from "@tanstack/react-query";

import { apiDelete, apiGet } from "@shared/api/http";

export type IdentityKind = "TELEGRAM" | "EMAIL" | "GOOGLE" | "YANDEX";

export interface Identity {
  kind: IdentityKind;
  linked: boolean;
  label: string | null;
}

export function useIdentitiesQuery() {
  return useQuery({
    queryKey: ["identities"],
    queryFn: ({ signal }) => apiGet<{ items: Identity[] }>("/users/me/identities", signal).then((r) => r.items),
  });
}

export function unlinkIdentity(kind: IdentityKind) {
  return apiDelete(`/users/me/identities/${kind.toLowerCase()}`);
}
