import { describe, it, expect } from "vitest";
import { accountBalance, overallBalance, monthTotals } from "./balances";

const scb = { id: "a1", opening_balance: 1000 };
const bkash = { id: "a2", opening_balance: 50 };

const txns = [
  { account_id: "a1", date: "2026-01-05", type: "income" as const, amount: 500 },
  { account_id: "a1", date: "2026-01-10", type: "expense" as const, amount: 200 },
  { account_id: "a1", date: "2026-02-01", type: "expense" as const, amount: 2000 },
  { account_id: "a2", date: "2026-01-15", type: "expense" as const, amount: 20 },
];

describe("accountBalance", () => {
  it("adds income and subtracts expense onto opening balance", () => {
    // 1000 + 500 - 200 - 2000 = -700
    expect(accountBalance(scb, txns)).toBe(-700);
  });
  it("ignores transactions for other accounts", () => {
    expect(accountBalance(bkash, txns)).toBe(30);
  });
  it("can go negative", () => {
    expect(accountBalance({ id: "a1", opening_balance: 0 }, txns)).toBeLessThan(0);
  });
});

describe("overallBalance", () => {
  it("sums every account balance", () => {
    expect(overallBalance([scb, bkash], txns)).toBe(-670);
  });
});

describe("monthTotals", () => {
  it("filters by year and month and returns income/expense/net", () => {
    expect(monthTotals(txns, 2026, 1)).toEqual({
      income: 500,
      expense: 220,
      net: 280,
    });
  });
  it("returns zeros for an empty month", () => {
    expect(monthTotals(txns, 2026, 7)).toEqual({ income: 0, expense: 0, net: 0 });
  });
});
