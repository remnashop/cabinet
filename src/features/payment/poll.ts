// most gateways confirm within seconds; after that, back off
export function nextPollDelay(attempt: number): number {
  return attempt < 10 ? 2000 : 5000;
}

// after this a still-PENDING order is reported as "processing", the backend notifies the user later
export const POLL_TIMEOUT_MS = 180_000;
