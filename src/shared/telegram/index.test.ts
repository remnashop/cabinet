import { expect, it, vi } from "vitest";

import { createBackStack } from "@shared/telegram";

const fakeButton = () => {
  let listener: (() => void) | null = null;
  const button = {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn((fn: () => void) => {
      listener = fn;
      return () => {};
    }),
  };
  return { button, press: () => listener?.() };
};

it("only the top handler fires; closing it restores the one below and hides when empty", () => {
  const { button, press } = fakeButton();
  const push = createBackStack(button);
  const page = { current: vi.fn() };
  const sheet = { current: vi.fn() };

  const offPage = push(page);
  const offSheet = push(sheet);
  press();
  expect(sheet.current).toHaveBeenCalledTimes(1);
  expect(page.current).not.toHaveBeenCalled();

  offSheet();
  expect(button.hide).not.toHaveBeenCalled();
  press();
  expect(page.current).toHaveBeenCalledTimes(1);

  offPage();
  expect(button.hide).toHaveBeenCalledTimes(1);
  expect(button.onClick).toHaveBeenCalledTimes(1);
});

it("a handler swapped in place keeps its position in the stack", () => {
  const { button, press } = fakeButton();
  const push = createBackStack(button);
  const page = { current: vi.fn() };
  const sheet = { current: vi.fn() };
  push(page);
  push(sheet);
  const next = vi.fn();
  page.current = next;
  press();
  expect(sheet.current).toHaveBeenCalledTimes(1);
  expect(next).not.toHaveBeenCalled();
});
