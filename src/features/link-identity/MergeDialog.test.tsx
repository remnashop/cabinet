import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@shared/api/http";
import "@shared/i18n";

import { linkApi } from "./api";
import { MergeBody } from "./MergeDialog";

vi.mock("./api", () => ({ linkApi: { merge: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const other = { subscriptions: 2, transactions: 5, referrals: 1, identities: [] };
let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
let client: QueryClient;
const handlers = { onClose: vi.fn(), onMerged: vi.fn(), onExpired: vi.fn() };
const mergeButton = () => [...container.querySelectorAll("button")].at(-1)!;
const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));

const cancelButton = () => [...container.querySelectorAll("button")].at(-2)!;

async function render(expiresIn: number, token = "t") {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MergeBody key={token} offer={{ kind: "GOOGLE", token, expiresIn, other }} {...handlers} />
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  Object.values(handlers).forEach((h) => h.mockReset());
  vi.mocked(linkApi.merge).mockReset();
  client = new QueryClient();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("MergeBody", () => {
  it("refetches the account data after a merge", async () => {
    vi.mocked(linkApi.merge).mockResolvedValue({});
    const spy = vi.spyOn(client, "invalidateQueries");
    await render(600);
    await act(async () => mergeButton().click());
    await tick();
    const keys = spy.mock.calls.map(([f]) => ((f as { queryKey: string[] }).queryKey)[0]);
    expect(keys).toEqual(["me", "identities", "subscriptions", "referral", "transactions"]);
    expect(handlers.onMerged).toHaveBeenCalled();
  });

  it("hands an expired token to the page", async () => {
    vi.mocked(linkApi.merge).mockRejectedValue(new ApiError(409, "Merge token is invalid", "MERGE_TOKEN_INVALID"));
    await render(600);
    await act(async () => mergeButton().click());
    await tick();
    expect(handlers.onExpired).toHaveBeenCalledWith(expect.stringContaining("expired"));
    expect(handlers.onMerged).not.toHaveBeenCalled();
  });

  it("disables the button once the time is up", async () => {
    await render(0);
    expect(mergeButton().disabled).toBe(true);
    expect(container.textContent).toContain("Time is up");
  });

  it("keeps Cancel disabled while the merge is in flight", async () => {
    vi.mocked(linkApi.merge).mockReturnValue(new Promise(() => {}));
    await render(600);
    expect(cancelButton().disabled).toBe(false);
    await act(async () => mergeButton().click());
    await tick();
    expect(cancelButton().disabled).toBe(true);
  });

  it("treats any other 409 as final", async () => {
    vi.mocked(linkApi.merge).mockRejectedValue(new ApiError(409, "blocked", "MERGE_ACCOUNT_BLOCKED"));
    await render(600);
    await act(async () => mergeButton().click());
    await tick();
    expect(container.textContent).toContain("The other account is blocked");
    expect(mergeButton().disabled).toBe(true);
    expect(cancelButton().disabled).toBe(false);
    expect(handlers.onExpired).not.toHaveBeenCalled();
  });

  it("treats any other 4xx as final, keeps a 5xx retryable", async () => {
    vi.mocked(linkApi.merge).mockRejectedValue(new ApiError(403, "staff", "MERGE_ACCOUNT_PRIVILEGED"));
    await render(600);
    await act(async () => mergeButton().click());
    await tick();
    expect(mergeButton().disabled).toBe(true);

    vi.mocked(linkApi.merge).mockRejectedValue(new ApiError(500, "boom"));
    await render(600, "other");
    await act(async () => mergeButton().click());
    await tick();
    expect(mergeButton().disabled).toBe(false);
  });

  it("ignores a late answer for an offer that was replaced", async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(linkApi.merge).mockReturnValue(new Promise((r) => (resolve = r)));
    await render(600, "old");
    await act(async () => mergeButton().click());
    await render(600, "new");
    await act(async () => resolve({}));
    await tick();
    expect(handlers.onMerged).not.toHaveBeenCalled();
  });
});
