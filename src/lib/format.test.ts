import { describe, expect, it } from "vitest";
import { daysLeft, formatBytes } from "@/lib/format";

describe("formatBytes", () => {
  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });
  it("formats gigabytes with one decimal", () => {
    expect(formatBytes(1_610_612_736)).toBe("1.5 GB");
  });
});

describe("daysLeft", () => {
  it("counts whole days ahead", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(daysLeft("2026-06-25T00:00:00Z", now)).toBe(5);
  });
  it("clamps past dates to zero", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(daysLeft("2026-06-19T00:00:00Z", now)).toBe(0);
  });
});
