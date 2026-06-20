import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleResponseError,
  isUnauthorized,
  setUnauthorizedHandler,
} from "@/api/client";

function axiosErrorWithStatus(status: number): AxiosError {
  const error = new AxiosError("err");
  error.response = {
    status,
    statusText: "",
    data: null,
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

afterEach(() => setUnauthorizedHandler(() => {}));

describe("isUnauthorized", () => {
  it("is true for a 401 axios error", () => {
    expect(isUnauthorized(axiosErrorWithStatus(401))).toBe(true);
  });
  it("is false for a 500 axios error", () => {
    expect(isUnauthorized(axiosErrorWithStatus(500))).toBe(false);
  });
  it("is false for a non-axios error", () => {
    expect(isUnauthorized(new Error("boom"))).toBe(false);
  });
});

describe("handleResponseError", () => {
  it("calls the unauthorized handler on 401 and rejects", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    await expect(handleResponseError(axiosErrorWithStatus(401))).rejects.toBeDefined();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
  it("does not call the handler on 500", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    await expect(handleResponseError(axiosErrorWithStatus(500))).rejects.toBeDefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
