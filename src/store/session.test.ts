import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/store/session";
import type { Me } from "@/api/auth";

const sampleMe: Me = {
  telegram_id: null,
  auth_type: "email",
  email: "a@b.com",
  is_email_verified: true,
  pending_email: null,
  name: "Alice",
  username: null,
  language: "ru",
};

beforeEach(() => useSessionStore.getState().clear());

describe("useSessionStore", () => {
  it("starts empty", () => {
    expect(useSessionStore.getState().me).toBeNull();
  });
  it("stores and clears me", () => {
    useSessionStore.getState().setMe(sampleMe);
    expect(useSessionStore.getState().me?.email).toBe("a@b.com");
    useSessionStore.getState().clear();
    expect(useSessionStore.getState().me).toBeNull();
  });
});
