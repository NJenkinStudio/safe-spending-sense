import { describe, expect, it } from "vitest";
import { computeBuyingPower } from "./buying-power";
import type { Account, FinancialRule } from "@/lib/forecast/types";

const acct = (over: Partial<Account> = {}): Account => ({
  id: "a1",
  name: "Main",
  account_type: "checking",
  current_balance: 1000,
  minimum_balance: 100,
  include_in_forecast: true,
  color: "#000",
  balance_as_of: "2026-01-01",
  ...over,
});

const rule = (over: Partial<FinancialRule>): FinancialRule => ({
  id: "r1",
  rule_type: "income",
  name: "Rule",
  source_account_id: null,
  destination_account_id: "a1",
  amount: 100,
  frequency: "monthly",
  interval_count: 1,
  day_of_week: null,
  day_of_month: null,
  start_date: "2026-01-01",
  end_date: null,
  occurrence_limit: null,
  occurrences_completed: 0,
  category: null,
  essential: false,
  fixed_or_variable: "fixed",
  active: true,
  confidence_level: "confirmed",
  notes: null,
  ...over,
});

const START = new Date("2026-01-02T00:00:00");
const END = new Date("2026-04-30T00:00:00");

describe("computeBuyingPower", () => {
  it("counts incoming income during the window (buying power >= 0 when income covers bills)", () => {
    const income = rule({ id: "inc", rule_type: "income", frequency: "monthly", start_date: "2026-01-15", amount: 800, destination_account_id: "a1" });
    const bill = rule({ id: "bill", rule_type: "expense", frequency: "monthly", start_date: "2026-01-10", amount: 500, source_account_id: "a1", essential: true });
    const res = computeBuyingPower({
      accounts: [acct({ current_balance: 1000, minimum_balance: 100 })],
      rules: [income, bill],
      changes: [],
      start: START,
      end: END,
    });
    // Lowest occurs on Jan 10 (bill fires before mid-month paycheck): 1000-500=500.
    // Buying power = 500 - 100 minimum = 400.
    expect(res.perAccount[0].lowestBalance).toBe(500);
    expect(res.buyingPower).toBe(400);
    expect(res.isNegative).toBe(false);
  });

  it("reserves money for irregular (non-monthly) essential bills", () => {
    const biweeklyBill = rule({ id: "b1", rule_type: "expense", frequency: "biweekly", start_date: "2026-01-05", amount: 150, source_account_id: "a1", essential: true });
    const res = computeBuyingPower({
      accounts: [acct({ current_balance: 1000, minimum_balance: 0 })],
      rules: [biweeklyBill],
      changes: [],
      start: START,
      end: END,
    });
    // 8 biweekly hits (Jan 5, 19, Feb 2, 16, Mar 2, 16, 30, Apr 13, 27) => -1200.
    // Reserved is exactly what leaves before the trough; obligations >= reserved bill total.
    expect(res.reserved).toBeGreaterThan(0);
    expect(res.upcomingObligations).toBeGreaterThanOrEqual(res.reserved);
    expect(res.buyingPower).toBe(res.perAccount[0].lowestBalance - res.perAccount[0].minimumBalance);
  });

  it("treats transfers-out as obligations on the source account (reserved money)", () => {
    const a = acct({ id: "a1", current_balance: 1000, minimum_balance: 100 });
    const b = acct({ id: "a2", current_balance: 0, minimum_balance: 0, name: "Bills" });
    const transfer = rule({ id: "t", rule_type: "transfer", frequency: "weekly", start_date: "2026-01-02", amount: 100, source_account_id: "a1", destination_account_id: "a2", day_of_week: 5 });
    const res = computeBuyingPower({
      accounts: [a, b],
      rules: [transfer],
      changes: [],
      start: START,
      end: END,
    });
    const main = res.perAccount.find((x) => x.accountId === "a1")!;
    const bills = res.perAccount.find((x) => x.accountId === "a2")!;
    expect(main.upcomingObligations).toBeGreaterThan(0);
    expect(main.reserved).toBeGreaterThan(0);
    // Transfer-in credits the bills account, so bills should NOT go below zero.
    expect(bills.lowestBalance).toBeGreaterThanOrEqual(0);
  });

  it("returns negative buying power when the trough breaches the minimum", () => {
    const bigBill = rule({ id: "big", rule_type: "expense", frequency: "one_time", start_date: "2026-01-10", amount: 950, source_account_id: "a1", essential: true });
    const res = computeBuyingPower({
      accounts: [acct({ current_balance: 1000, minimum_balance: 200 })],
      rules: [bigBill],
      changes: [],
      start: START,
      end: END,
    });
    // Lowest = 50; minimum = 200; buying power = -150.
    expect(res.perAccount[0].lowestBalance).toBe(50);
    expect(res.buyingPower).toBe(-150);
    expect(res.isNegative).toBe(true);
  });

  it("respects the minimum-balance reservation (higher minimum lowers buying power dollar-for-dollar)", () => {
    const bill = rule({ id: "b", rule_type: "expense", frequency: "monthly", start_date: "2026-01-15", amount: 200, source_account_id: "a1", essential: true });
    const low = computeBuyingPower({
      accounts: [acct({ current_balance: 1000, minimum_balance: 100 })],
      rules: [bill],
      changes: [],
      start: START,
      end: END,
    });
    const high = computeBuyingPower({
      accounts: [acct({ current_balance: 1000, minimum_balance: 400 })],
      rules: [bill],
      changes: [],
      start: START,
      end: END,
    });
    expect(low.buyingPower - high.buyingPower).toBe(300);
  });
});