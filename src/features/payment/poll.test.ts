import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTransaction, type Transaction } from "@entities/transaction/api";
import { ApiError, NetworkError } from "@shared/api/http";

import { nextPollDelay, POLL_TIMEOUT_MS } from "./poll";
import { usePaymentStatus } from "./usePaymentStatus";

vi.mock("@entities/transaction/api", () => ({ getTransaction: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fetchTx = vi.mocked(getTransaction);
const tx = (status: Transaction["status"]) => ({ id: 7, status }) as Transaction;

const onRender = vi.fn<(s: ReturnType<typeof usePaymentStatus>) => void>();
const status = () => onRender.mock.lastCall?.[0].status;
let root: ReturnType<typeof createRoot>;

function Probe() {
  onRender(usePaymentStatus(7));
  return null;
}

async function mount() {
  root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(Probe)));
  });
}

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.useFakeTimers();
  fetchTx.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  vi.useRealTimers();
});

describe("nextPollDelay", () => {
  it("polls every 2s for the first 10 attempts, then every 5s", () => {
    expect(nextPollDelay(0)).toBe(2000);
    expect(nextPollDelay(9)).toBe(2000);
    expect(nextPollDelay(10)).toBe(5000);
  });
});

describe("usePaymentStatus", () => {
  it("stops on PAID", async () => {
    fetchTx.mockResolvedValueOnce(tx("PENDING")).mockResolvedValueOnce(tx("PENDING")).mockResolvedValue(tx("PAID"));
    await mount();
    expect(status()).toBe("pending");
    await advance(2000);
    await advance(2000);
    expect(status()).toBe("paid");
    expect(fetchTx).toHaveBeenCalledTimes(3);
    await advance(60_000);
    expect(fetchTx).toHaveBeenCalledTimes(3);
  });

  it.each(["FAILED", "CANCELED", "REFUNDED"] as const)("stops on %s as failed", async (final) => {
    fetchTx.mockResolvedValue(tx(final));
    await mount();
    expect(status()).toBe("failed");
    await advance(60_000);
    expect(fetchTx).toHaveBeenCalledTimes(1);
  });

  it("stops on a 4xx and exposes the error", async () => {
    const err = new ApiError(404, "Transaction not found", "PAYMENT_ORDER_NOT_FOUND");
    fetchTx.mockRejectedValue(err);
    await mount();
    expect(status()).toBe("error");
    expect(onRender.mock.lastCall?.[0].error).toBe(err);
    await advance(60_000);
    expect(fetchTx).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx and a network error until PAID", async () => {
    fetchTx
      .mockRejectedValueOnce(new ApiError(500, "boom"))
      .mockRejectedValueOnce(new NetworkError("offline"))
      .mockResolvedValue(tx("PAID"));
    await mount();
    await advance(2000);
    await advance(2000);
    expect(status()).toBe("paid");
    expect(fetchTx).toHaveBeenCalledTimes(3);
  });

  it("gives up after POLL_TIMEOUT_MS of PENDING", async () => {
    fetchTx.mockResolvedValue(tx("PENDING"));
    await mount();
    await advance(POLL_TIMEOUT_MS);
    expect(status()).toBe("timeout");
    const calls = fetchTx.mock.calls.length;
    await advance(60_000);
    expect(fetchTx).toHaveBeenCalledTimes(calls);
  });

  it("stops polling on unmount", async () => {
    fetchTx.mockResolvedValue(tx("PENDING"));
    await mount();
    await advance(1000);
    act(() => root.unmount());
    const calls = fetchTx.mock.calls.length;
    await advance(60_000);
    expect(fetchTx).toHaveBeenCalledTimes(calls);
  });
});
