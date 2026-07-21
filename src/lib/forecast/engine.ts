import { addDays, addMonths, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import type {
  Account,
  DayBalance,
  EventKind,
  FinancialRule,
  ForecastEvent,
  ForecastResult,
  RuleChange,
} from "./types";
import { applyChanges, fmt, generateOccurrences } from "./recurrence";

const eventOrder: Record<EventKind, number> = {
  income: 0,
  transfer_in: 1,
  transfer_out: 2,
  expense_essential: 3,
  expense_discretionary: 4,
  one_time: 5,
};

export interface ForecastInput {
  accounts: Account[];
  rules: FinancialRule[];
  changes: RuleChange[];
  start: Date;
  end: Date;
}

export function runForecast({ accounts, rules, changes, start, end }: ForecastInput): ForecastResult {
  const events: ForecastEvent[] = [];
  const s = startOfDay(start);
  const e = startOfDay(end);

  for (const rule of rules) {
    if (!rule.active) continue;
    const dates = generateOccurrences(rule, s, e);
    for (const d of dates) {
      const eff = applyChanges(rule, changes, d);
      if (!eff.active) continue;
      const amount = Number(eff.amount);
      const dateStr = fmt(d);
      if (eff.rule_type === "income" && eff.destination_account_id) {
        events.push({
          date: dateStr,
          ruleId: rule.id,
          ruleName: eff.name,
          kind: "income",
          accountId: eff.destination_account_id,
          amount,
          category: eff.category,
        });
      } else if (eff.rule_type === "transfer") {
        if (eff.source_account_id) {
          events.push({
            date: dateStr,
            ruleId: rule.id,
            ruleName: eff.name,
            kind: "transfer_out",
            accountId: eff.source_account_id,
            amount: -amount,
          });
        }
        if (eff.destination_account_id) {
          events.push({
            date: dateStr,
            ruleId: rule.id,
            ruleName: eff.name,
            kind: "transfer_in",
            accountId: eff.destination_account_id,
            amount,
          });
        }
      } else if (eff.rule_type === "expense" && eff.source_account_id) {
        events.push({
          date: dateStr,
          ruleId: rule.id,
          ruleName: eff.name,
          kind: eff.essential ? "expense_essential" : "expense_discretionary",
          accountId: eff.source_account_id,
          amount: -amount,
          category: eff.category,
        });
      } else if (eff.rule_type === "one_time" && eff.source_account_id) {
        events.push({
          date: dateStr,
          ruleId: rule.id,
          ruleName: eff.name,
          kind: "one_time",
          accountId: eff.source_account_id,
          amount: -amount,
        });
      }
    }
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return eventOrder[a.kind] - eventOrder[b.kind];
  });

  const balances: Record<string, number> = {};
  for (const a of accounts) balances[a.id] = Number(a.current_balance);

  const daily: DayBalance[] = [];
  const lowestByAccount: Record<string, { date: string; balance: number }> = {};
  const negativeDatesByAccount: Record<string, string[]> = {};
  for (const a of accounts) {
    lowestByAccount[a.id] = { date: fmt(s), balance: balances[a.id] };
    negativeDatesByAccount[a.id] = [];
  }

  let cursor = s;
  let idx = 0;
  while (!isAfter(cursor, e)) {
    const dateStr = fmt(cursor);
    const dayEvents: ForecastEvent[] = [];
    while (idx < events.length && events[idx].date === dateStr) {
      const ev = events[idx];
      balances[ev.accountId] = (balances[ev.accountId] ?? 0) + ev.amount;
      dayEvents.push(ev);
      idx++;
    }
    for (const a of accounts) {
      const b = balances[a.id] ?? 0;
      if (b < lowestByAccount[a.id].balance) {
        lowestByAccount[a.id] = { date: dateStr, balance: b };
      }
      if (b < 0) negativeDatesByAccount[a.id].push(dateStr);
    }
    daily.push({
      date: dateStr,
      balances: { ...balances },
      total: Object.values(balances).reduce((sum, v) => sum + v, 0),
      events: dayEvents,
    });
    cursor = addDays(cursor, 1);
  }

  const monthly: Array<{ month: string; inflow: number; outflow: number; net: number }> = [];
  const buckets = new Map<string, { inflow: number; outflow: number }>();
  for (const ev of events) {
    const m = ev.date.slice(0, 7);
    const bucket = buckets.get(m) ?? { inflow: 0, outflow: 0 };
    if (ev.amount > 0 && (ev.kind === "income" || ev.kind === "transfer_in" || ev.kind === "one_time")) {
      if (ev.kind === "income") bucket.inflow += ev.amount;
    } else if (ev.amount < 0) {
      if (ev.kind !== "transfer_out") bucket.outflow += -ev.amount;
    }
    buckets.set(m, bucket);
  }
  for (const [month, v] of Array.from(buckets.entries()).sort()) {
    monthly.push({ month, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow });
  }

  return { events, daily, lowestByAccount, negativeDatesByAccount, monthly, endingBalances: balances };
}

export function payoffDate(rule: FinancialRule): string | null {
  if (!rule.occurrence_limit) return null;
  const remaining = rule.occurrence_limit - (rule.occurrences_completed ?? 0);
  if (remaining <= 0) return null;
  const dates = generateOccurrences(rule, parseISO(rule.start_date), addMonths(new Date(), 120));
  if (!dates.length) return null;
  const last = dates[Math.min(remaining, dates.length) - 1];
  return format(last, "yyyy-MM-dd");
}

export { isBefore, isAfter };