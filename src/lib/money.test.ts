import { describe, it, expect } from "vitest";
import { formatBDT, parseAmount, sumAmounts, formatBDTCompact } from "./money";

describe("formatBDT", () => {
  it("formats with thousands separators and two decimals", () => {
    expect(formatBDT(63960.36)).toBe("৳63,960.36");
  });
  it("formats whole numbers with two decimals", () => {
    expect(formatBDT(9660)).toBe("৳9,660.00");
  });
  it("formats negatives with a leading minus", () => {
    expect(formatBDT(-500)).toBe("-৳500.00");
  });
});

describe("parseAmount", () => {
  it("strips commas", () => {
    expect(parseAmount("63,960.36")).toBeCloseTo(63960.36, 2);
  });
  it("strips currency symbols", () => {
    expect(parseAmount("৳1,000")).toBe(1000);
  });
  it("returns NaN for non-numeric", () => {
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount(null)).toBeNaN();
  });
});

describe("sumAmounts", () => {
  it("sums fractional amounts without float drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in float; must be exactly 0.3
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([63960.36, 9660, 2.4])).toBe(73622.76);
  });
});

describe("formatBDTCompact", () => {
  it("abbreviates thousands", () => {
    expect(formatBDTCompact(263210)).toBe("৳263.2k");
  });
});
