import { describe, expect, it } from "vitest";
import { runForecast } from "./engine";
import type { Account, FinancialRule, RuleChange } from "./types";

const acct = (over: Partial<Account> = {}): Account => ({
  id: "a1",
  name: "Main",
  account_type: "checking",
  current_balance: 1000,
  minimum_balance: 0,
  include_in_forecast: true,
  color: "#000",
  balance_as_of: null,
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

const run = (rules: FinancialRule[], opts: { changes?: RuleChange[]; accounts?: Account[]; start?: string; end?: string } = {}) =>
  runForecast({
    accounts: opts.accounts ?? [acct()],
    rules,
    changes: opts.changes ?? [],
    start: new Date(opts.start ?? "2026-01-01T00:00:00"),
    end: new Date(opts.end ?? "2026-03-31T00:00:00"),
  });

describe("forecast engine", () => {
  it("weekly generates one event per week", () => {
    const r = rule({ frequency: "weekly", amount: 50, start_date: "2026-01-05" });
    const res = run([r], { end: "2026-02-01" });
    const dates = res.events.map((e) => e.date);
    expect(dates).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
  });

  it("biweekly generates every 14 days", () => {
    const r = rule({ frequency: "biweekly", amount: 200, start_date: "2026-01-02" });
    const res = run([r], { end: "2026-03-01" });
    expect(res.events.map((e) => e.date)).toEqual([
      "2026-01-02",
      "2026-01-16",
      "2026-01-30",
      "2026-02-13",
      "2026-02-27",
    ]);
  });

  it("monthly repeats on same day each month", () => {
    const r = rule({ frequency: "monthly", amount: 300, start_date: "2026-01-15" });
    const res = run([r]);
    expect(res.events.map((e) => e.date)).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("respects occurrence_limit across the horizon", () => {
    const r = rule({ frequency: "weekly", amount: 40, start_date: "2026-01-01", occurrence_limit: 3 });
    const res = run([r], { end: "2026-06-01" });
    expect(res.events).toHaveLength(3);
    expect(res.events.at(-1)!.date).toBe("2026-01-15");
  });

  it("applies scheduled future amount changes", () => {
    const r = rule({ frequency: "monthly", amount: 100, start_date: "2026-01-01", destination_account_id: "a1" });
    const changes: RuleChange[] = [
      { id: "c1", financial_rule_id: "r1", effective_date: "2026-02-01", field_name: "amount", new_value: "250", old_value: "100" },
    ];
    const res = run([r], { changes });
    const amounts = res.events.map((e) => e.amount);
    expect(amounts).toEqual([100, 250, 250]);
  });

  it("month-end dates roll to shorter months and land on last day", () => {
    const r = rule({ frequency: "monthly", start_date: "2026-01-31", amount: 10 });
    const res = run([r], { end: "2026-04-30" });
    // date-fns addMonths rolls Jan 31 → Feb 28 (2026 not leap) → Mar 28 → Apr 28
    expect(res.events.map((e) => e.date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-28",
      "2026-04-28",
    ]);
  });

  it("transfers debit source and credit destination on same day", () => {
    const a = acct({ id: "a1", current_balance: 500 });
    const b = acct({ id: "a2", current_balance: 0, name: "Bills" });
    const r = rule({
      rule_type: "transfer",
      frequency: "one_time",
      amount: 150,
      source_account_id: "a1",
      destination_account_id: "a2",
      start_date: "2026-01-10",
    });
    const res = run([r], { accounts: [a, b], end: "2026-01-31" });
    const day = res.daily.find((d) => d.date === "2026-01-10")!;
    expect(day.balances["a1"]).toBe(350);
    expect(day.balances["a2"]).toBe(150);
    expect(day.events).toHaveLength(2);
  });

  it("orders same-day events: income before expense before transfer_out", () => {
    const a = acct({ id: "a1", current_balance: 0 });
    const b = acct({ id: "a2", current_balance: 0 });
    const income = rule({ id: "r1", rule_type: "income", frequency: "one_time", amount: 500, start_date: "2026-01-05", destination_account_id: "a1" });
    const expense = rule({ id: "r2", rule_type: "expense", frequency: "one_time", amount: 100, start_date: "2026-01-05", source_account_id: "a1", essential: true });
    const transfer = rule({ id: "r3", rule_type: "transfer", frequency: "one_time", amount: 50, start_date: "2026-01-05", source_account_id: "a1", destination_account_id: "a2" });
    const res = run([expense, transfer, income], { accounts: [a, b], end: "2026-01-31" });
    const kinds = res.events.filter((e) => e.date === "2026-01-05").map((e) => e.kind);
    expect(kinds.slice(0, 3)).toEqual(["income", "transfer_in", "transfer_out"]);
    // Same-day math shouldn't dip negative given the ordering.
    expect(res.negativeDatesByAccount["a1"]).toEqual([]);
  });

  it("uses balance_as_of as starting reference and replays events since then", () => {
    // Balance $1000 as of Jan 1; $200 income on Jan 15; forecast window starts Feb 1.
    const a = acct({ current_balance: 1000, balance_as_of: "2026-01-01" });
    const r = rule({ frequency: "monthly", start_date: "2026-01-15", amount: 200, destination_account_id: "a1" });
    const res = run([r], { accounts: [a], start: "2026-02-01", end: "2026-02-28" });
    // Feb 1 opening balance should reflect the Jan 15 event.
    expect(res.daily[0].balances["a1"]).toBe(1200);
    // The Feb 15 event should still fire in-window.
    expect(res.daily.find((d) => d.date === "2026-02-15")!.balances["a1"]).toBe(1400);
  });
});