import { describe, it, expect } from "vitest";
import { parseRows, normalizeDate, type RawRow } from "./parse";

describe("normalizeDate", () => {
  it("passes ISO through", () => {
    expect(normalizeDate("2026-11-15")).toBe("2026-11-15");
  });
  it("handles day-first slash dates", () => {
    expect(normalizeDate("15/6/2020")).toBe("2020-06-15");
  });
  it("handles month-first slash dates", () => {
    expect(normalizeDate("6/15/2020")).toBe("2020-06-15");
  });
  it("rejects nonsense", () => {
    expect(normalizeDate("not a date")).toBeNull();
  });
});

describe("parseRows", () => {
  const rows: RawRow[] = [
    { account: "Standard Chartered Bank", date: "2020-06-05", desc: "Beginning Balance", amount: 63960.36, kind: "begin" },
    { account: "bKash", date: "2020-06-05", desc: "Beginning Balance", amount: 9660, kind: "begin" },
    { account: "SCB", date: "2020-06-15", desc: "Salary", amount: 18000, kind: "in" },
    { account: "SCB", date: "2020-06-17", desc: "7 up", amount: 600, kind: "out" },
    { account: "Bkash", date: "2020-06-10", desc: "Abbu Send Money", amount: "", kind: "out" },
    { account: "Martian Bank", date: "2020-06-10", desc: "Alien", amount: 5, kind: "out" },
  ];

  const result = parseRows(rows);

  it("derives opening balances from the first beginning row per account", () => {
    const scb = result.accounts.find((a) => a.key === "SCB");
    expect(scb?.opening_balance).toBe(63960.36);
    expect(scb?.type).toBe("bank");
  });

  it("excludes beginning-balance rows from transactions", () => {
    expect(result.transactions.some((t) => t.description === "Beginning Balance")).toBe(false);
  });

  it("maps in -> income and out -> expense", () => {
    const salary = result.transactions.find((t) => t.description === "Salary");
    expect(salary?.type).toBe("income");
    expect(salary?.category).toBe("Salary");
    const up = result.transactions.find((t) => t.description === "7 up");
    expect(up?.type).toBe("expense");
  });

  it("skips rows with no valid amount", () => {
    expect(result.skipped.some((s) => s.reason === "no valid amount")).toBe(true);
  });

  it("skips rows with an unknown account", () => {
    expect(result.skipped.some((s) => s.reason === "unknown account")).toBe(true);
  });
});
