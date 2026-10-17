// keeps the user's card across refetches (a purchase or deletion reorders the list)
export function pickSelected(prevId: number | null, ids: number[]): number | null {
  return prevId !== null && ids.includes(prevId) ? prevId : (ids[0] ?? null);
}
