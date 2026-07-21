import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isAfter,
  isBefore,
  parseISO,
  setDate,
  startOfDay,
} from "date-fns";
import type { FinancialRule, RuleChange } from "./types";

export const fmt = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Return dates on/after start and on/before end for a rule.
 */
export function generateOccurrences(
  rule: FinancialRule,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  if (!rule.active) return [];
  const start = parseISO(rule.start_date);
  const end = rule.end_date ? parseISO(rule.end_date) : windowEnd;
  const effectiveEnd = isBefore(end, windowEnd) ? end : windowEnd;

  const dates: Date[] = [];
  const limit = rule.occurrence_limit ?? Infinity;
  const alreadyDone = rule.occurrences_completed ?? 0;
  let remaining = Math.max(0, limit - alreadyDone);

  const push = (d: Date) => {
    if (isBefore(d, start)) return;
    if (isAfter(d, effectiveEnd)) return;
    if (isBefore(d, startOfDay(windowStart))) {
      // still count towards limit
      remaining -= 1;
      return;
    }
    if (remaining <= 0) return;
    dates.push(d);
    remaining -= 1;
  };

  const interval = rule.interval_count && rule.interval_count > 0 ? rule.interval_count : 1;

  switch (rule.frequency) {
    case "one_time":
      push(start);
      break;
    case "weekly": {
      let d = start;
      while (!isAfter(d, effectiveEnd) && remaining > 0) {
        push(d);
        d = addWeeks(d, 1);
      }
      break;
    }
    case "biweekly": {
      let d = start;
      while (!isAfter(d, effectiveEnd) && remaining > 0) {
        push(d);
        d = addWeeks(d, 2);
      }
      break;
    }
    case "semimonthly": {
      let cursor = setDate(start, 1);
      while (!isAfter(cursor, effectiveEnd) && remaining > 0) {
        const d1 = setDate(cursor, 1);
        const d15 = setDate(cursor, 15);
        push(d1);
        if (remaining > 0) push(d15);
        cursor = addMonths(cursor, 1);
      }
      break;
    }
    case "monthly": {
      let d = start;
      while (!isAfter(d, effectiveEnd) && remaining > 0) {
        push(d);
        d = addMonths(d, interval);
      }
      break;
    }
    case "quarterly": {
      let d = start;
      while (!isAfter(d, effectiveEnd) && remaining > 0) {
        push(d);
        d = addMonths(d, 3);
      }
      break;
    }
    case "annually": {
      let d = start;
      while (!isAfter(d, effectiveEnd) && remaining > 0) {
        push(d);
        d = addYears(d, 1);
      }
      break;
    }
    case "custom": {
      let d = start;
      while (!isAfter(d, effectiveEnd) && remaining > 0) {
        push(d);
        d = addDays(d, interval);
      }
      break;
    }
  }
  return dates;
}

/**
 * Apply scheduled rule changes to yield a per-date effective rule snapshot.
 */
export function applyChanges(
  rule: FinancialRule,
  changes: RuleChange[],
  date: Date,
): FinancialRule {
  const applicable = changes
    .filter((c) => c.financial_rule_id === rule.id)
    .filter((c) => !isAfter(parseISO(c.effective_date), date))
    .sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  let out: FinancialRule = { ...rule };
  for (const c of applicable) {
    const field = c.field_name as keyof FinancialRule;
    let value: unknown = c.new_value;
    if (field === "amount") value = Number(c.new_value);
    if (field === "active") value = c.new_value === "true";
    (out as unknown as Record<string, unknown>)[field as string] = value;
  }
  return out;
}