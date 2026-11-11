import { expect, it } from "vitest";

import { formatBytes, formatDate, formatGb, formatMoney, formatRelative } from "@shared/lib/format";

it("formats money; XTR is a number with a star", () => {
  expect(formatMoney("149.00", "RUB", "ru")).toBe("149\u00a0₽");
  expect(formatMoney("149.5", "RUB", "ru")).toBe("149,50\u00a0₽");
  expect(formatMoney("149", "RUB", "en")).toBe("₽149");
  expect(formatMoney("150", "XTR", "ru")).toBe("150 ★");
});

it("formats bytes as GB or MB with one decimal", () => {
  expect(formatBytes(12.4 * 1024 ** 3, "ru")).toBe("12,4 ГБ");
  expect(formatBytes(0, "ru")).toBe("0 ГБ");
  expect(formatBytes(512 * 1024 ** 2, "ru")).toBe("512 МБ");
  expect(formatGb(100, "ru")).toBe("100 ГБ");
});

it("formats ru dates as dd.mm.yyyy", () => {
  expect(formatDate("2026-03-05T12:00:00Z", "ru")).toBe("05.03.2026");
});

it("formats a past time relative to now, in minutes, hours, then days", () => {
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  expect(formatRelative(ago(0), "ru")).toBe("менее минуты назад");
  expect(formatRelative(ago(5), "ru")).toBe("5 минут назад");
  expect(formatRelative(ago(120), "ru")).toBe("2 часа назад");
  expect(formatRelative(ago(60 * 24 * 3), "en")).toBe("3 days ago");
});
