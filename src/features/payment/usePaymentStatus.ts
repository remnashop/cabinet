import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getTransaction, type Transaction } from "@entities/transaction/api";
import { ApiError } from "@shared/api/http";

import { nextPollDelay, POLL_TIMEOUT_MS } from "./poll";
import { markPushPromptEligible } from "@features/push-prompt/push-prompt";

export type PaymentStatus = "loading" | "pending" | "paid" | "failed" | "timeout" | "error";

interface PaymentState {
  status: PaymentStatus;
  transaction?: Transaction;
  error?: unknown;
}

export function usePaymentStatus(orderId: number | null): PaymentState & { retry: () => void } {
  const client = useQueryClient();
  const [state, setState] = useState<PaymentState>({ status: "loading" });
  // bumped by "Check again" after the timeout: restarts the polling with a fresh deadline
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (orderId === null) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const stop = () => {
      ctrl.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
    };
    const deadline = setTimeout(() => {
      stop();
      setState((s) => ({ ...s, status: "timeout" }));
    }, POLL_TIMEOUT_MS);

    const poll = async (attempt: number) => {
      try {
        const transaction = await getTransaction(orderId, ctrl.signal);
        if (ctrl.signal.aborted) return;
        if (transaction.status === "PAID") {
          stop();
          setState({ status: "paid", transaction });
          // something was bought: the home page may offer push now
          markPushPromptEligible();
          void client.invalidateQueries({ queryKey: ["subscriptions"] });
          void client.invalidateQueries({ queryKey: ["me"] });
          return;
        }
        if (transaction.status !== "PENDING") {
          stop();
          setState({ status: "failed", transaction });
          return;
        }
        setState({ status: "pending", transaction });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        // 4xx (unknown order, not ours) won't change; network blips, 429 and 5xx are retried until the deadline
        if (err instanceof ApiError && err.status < 500 && err.status !== 429) {
          stop();
          setState({ status: "error", error: err });
          return;
        }
      }
      timer = setTimeout(() => void poll(attempt + 1), nextPollDelay(attempt));
    };
    void poll(0);
    return stop;
  }, [orderId, client, run]);

  const retry = () => {
    setState({ status: "loading" });
    setRun((n) => n + 1);
  };
  return { ...state, retry };
}
