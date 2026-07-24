import { addMonths } from "date-fns";
import type { Account, FinancialRule, RuleChange, ForecastResult } from "@/lib/forecast/types";
import { runForecast } from "@/lib/forecast/engine";

export interface AccountBuyingPower {
  accountId: string;
  name: string;
  currentBalance: number;
  minimumBalance: number;
  lowestBalance: number;
  lowestDate: string;
  /** Money leaving the account between now and the lowest point (>= 0). */
  reserved: number;
  /** Essential + transfer-out flows contributing to `reserved` (>= 0). */
  upcomingObligations: number;
  /** lowestBalance - minimumBalance. Negative => account will breach its minimum. */
  buyingPower: number;
}

export interface BuyingPowerSummary {
  perAccount: AccountBuyingPower[];
  currentBalance: number;
  minimumBalance: number;
  reserved: number;
  upcomingObligations: number;
  buyingPower: number;
  isNegative: boolean;
  forecast: ForecastResult;
}

export interface BuyingPowerInput {
  accounts: Account[];
  rules: FinancialRule[];
  changes: RuleChange[];
  /** Defaults to now. */
  start?: Date;
  /** Horizon; defaults to 12 months. */
  end?: Date;
  /** If set, restrict aggregation to a single account. */
  accountId?: string;
}

/**
 * Derive Buying Power from the same runForecast() outputs that power the
 * dashboard and the "Can I afford it?" flow. This is the single source of
 * truth for onboarding so no two surfaces disagree.
 *
 * Definitions (per account, over the forecast horizon):
 *   reserved              = max(0, current - lowest)      // money leaving before the trough
 *   upcomingObligations   = |essential expenses + transfers-out from now..lowestDate|
 *   buyingPower           = lowest - minimum              // matches decide.tsx safety math
 */
export function computeBuyingPower(input: BuyingPowerInput): BuyingPowerSummary {
  const start = input.start ?? new Date();
  const end = input.end ?? addMonths(start, 12);
  const accounts = input.accountId
    ? input.accounts.filter((a) => a.id === input.accountId)
    : input.accounts.filter((a) => a.include_in_forecast !== false);

  const forecast = runForecast({
    accounts: input.accounts,
    rules: input.rules,
    changes: input.changes,
    start,
    end,
  });

  const perAccount: AccountBuyingPower[] = accounts.map((a) => {
    const low = forecast.lowestByAccount[a.id] ?? { date: "", balance: Number(a.current_balance) };
    const current = Number(a.current_balance);
    const min = Number(a.minimum_balance) || 0;
    const reserved = Math.max(0, current - low.balance);

    // Sum obligations (essential expenses + transfers out) on this account
    // between the forecast start and the trough date. Discretionary spend is
    // intentionally excluded — it is exactly what Buying Power funds.
    let obligations = 0;
    for (const ev of forecast.events) {
      if (ev.accountId !== a.id) continue;
      if (low.date && ev.date > low.date) continue;
      if (ev.kind === "expense_essential" || ev.kind === "transfer_out") {
        obligations += -ev.amount; // amounts on these kinds are negative
      }
    }

    return {
      accountId: a.id,
      name: a.name,
      currentBalance: current,
      minimumBalance: min,
      lowestBalance: low.balance,
      lowestDate: low.date,
      reserved,
      upcomingObligations: obligations,
      buyingPower: low.balance - min,
    };
  });

  const sum = (fn: (a: AccountBuyingPower) => number) => perAccount.reduce((s, a) => s + fn(a), 0);
  const buyingPower = sum((a) => a.buyingPower);

  return {
    perAccount,
    currentBalance: sum((a) => a.currentBalance),
    minimumBalance: sum((a) => a.minimumBalance),
    reserved: sum((a) => a.reserved),
    upcomingObligations: sum((a) => a.upcomingObligations),
    buyingPower,
    isNegative: buyingPower < 0,
    forecast,
  };
}