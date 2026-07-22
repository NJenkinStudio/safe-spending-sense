export type RuleType = "income" | "expense" | "transfer" | "one_time";
export type Frequency =
  | "one_time"
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "custom";

export interface Account {
  id: string;
  name: string;
  account_type: string;
  current_balance: number;
  minimum_balance: number;
  include_in_forecast: boolean;
  color: string;
  /** ISO date (yyyy-MM-dd) representing the as-of date for current_balance. */
  balance_as_of?: string | null;
  institution_name?: string | null;
  plaid_account_id?: string | null;
  last_synced_at?: string | null;
}

export interface FinancialRule {
  id: string;
  rule_type: RuleType;
  name: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  frequency: Frequency;
  interval_count: number | null;
  day_of_week: number | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  occurrence_limit: number | null;
  occurrences_completed: number;
  category: string | null;
  essential: boolean;
  fixed_or_variable: string;
  active: boolean;
  confidence_level: string;
  notes: string | null;
}

export interface RuleChange {
  id: string;
  financial_rule_id: string;
  effective_date: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
}

export type EventKind =
  | "income"
  | "transfer_out"
  | "transfer_in"
  | "expense_essential"
  | "expense_discretionary"
  | "one_time";

export interface ForecastEvent {
  date: string; // yyyy-MM-dd
  ruleId: string;
  ruleName: string;
  kind: EventKind;
  accountId: string;
  amount: number; // signed relative to account (positive = credit)
  category?: string | null;
}

export interface DayBalance {
  date: string;
  balances: Record<string, number>;
  total: number;
  events: ForecastEvent[];
}

export interface ForecastResult {
  events: ForecastEvent[];
  daily: DayBalance[];
  lowestByAccount: Record<string, { date: string; balance: number }>;
  negativeDatesByAccount: Record<string, string[]>;
  monthly: Array<{ month: string; inflow: number; outflow: number; net: number }>;
  endingBalances: Record<string, number>;
}