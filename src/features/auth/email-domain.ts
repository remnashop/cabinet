// a hint only: existing customers sign in from any domain, so it never blocks the request
export function isUnlistedDomain(email: string, allowedDomains: string[] | null): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return allowedDomains !== null && domain.includes(".") && !allowedDomains.includes(domain);
}
