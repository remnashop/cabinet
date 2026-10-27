import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { EmailLogin, type EmailCodeFlow } from "./EmailLogin";

// stands in for the provider's iframe: a click "solves" it
vi.mock("@features/auth/ui/CaptchaWidget", () => ({
  CaptchaWidget: ({ round, onToken }: { round: number; onToken: (token: string | null) => void }) => (
    <button type="button" data-captcha onClick={() => onToken(`token-${round}`)} />
  ),
}));
vi.mock("@entities/legal/api", () => ({ useShownLegalLocale: () => undefined }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
const flow: EmailCodeFlow = { sendCode: vi.fn(async () => null), verify: vi.fn(async () => {}) };

const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));
async function until(check: () => void, timeout = 2000) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      return check();
    } catch (err) {
      if (Date.now() > end) throw err;
    }
    await tick();
  }
}

beforeEach(() => {
  vi.mocked(flow.sendCode).mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <EmailLogin allowedDomains={null} flow={flow} captcha={{ provider: "TURNSTILE", site_key: "site" }} />
      </QueryClientProvider>,
    );
  });
  const input = container.querySelector("input")!;
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setValue.call(input, "a@mail.ru");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const submit = () => container.querySelector<HTMLButtonElement>("button[type=submit]")!;

describe("EmailLogin with a captcha", () => {
  it("sends the code only with a solved captcha, and its token", async () => {
    await render();
    expect(submit().disabled).toBe(true);

    await act(async () => container.querySelector<HTMLButtonElement>("[data-captcha]")!.click());
    expect(submit().disabled).toBe(false);
    await act(async () => submit().click());

    await until(() => expect(flow.sendCode).toHaveBeenCalledWith("a@mail.ru", "en", "token-0"));
  });
});

const input = () => container.querySelector("input") as HTMLInputElement;
const message = () => container.querySelector("p.text-error")?.textContent ?? null;

function type(value: string) {
  // React tracks the value itself; the native setter makes its onChange fire
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
  input().dispatchEvent(new Event("input", { bubbles: true }));
}

it("shows the email error under the field instead of the browser bubble, and clears it once valid", () => {
  const sendCode = vi.fn(async () => {});
  act(() =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <EmailLogin allowedDomains={null} flow={{ sendCode, verify: async () => {} }} />
      </QueryClientProvider>,
    ),
  );

  act(() => container.querySelector("form")!.requestSubmit());
  expect(message()).toBe(i18n.t("auth.emailRequired"));
  expect(input().getAttribute("aria-invalid")).toBe("true");
  expect(sendCode).not.toHaveBeenCalled();

  act(() => type("not-an-email"));
  expect(message()).toBe(i18n.t("auth.emailInvalid"));

  act(() => type("user@example.com"));
  expect(message()).toBeNull();
  expect(input().getAttribute("aria-invalid")).toBe("false");
});
