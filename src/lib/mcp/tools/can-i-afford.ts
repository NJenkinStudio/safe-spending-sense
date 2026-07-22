import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { supabaseForUser, unauthenticated } from "../supabase-for-user";
import { runForecast } from "@/lib/forecast/engine";
import type { Account, FinancialRule, RuleChange } from "@/lib/forecast/types";

export default defineTool({
  name: "can_i_afford",
  title: "Can I afford it?",
  description:
    "Evaluate a hypothetical purchase against the signed-in user's forecast. Returns safe / warn / unsafe and the projected lowest balance for the chosen account with the purchase applied.",
  inputSchema: {
    account_id: z.string().uuid().describe("Account to charge the purchase against."),
    amount: z.number().positive().describe("Total purchase amount in dollars."),
    purchase_date: z.string().describe("ISO date yyyy-MM-dd for the purchase."),
    split_months: z
      .number()
      .int()
      .min(1)
      .max(24)
      .optional()
      .describe("If set >1, split the amount evenly over this many monthly payments starting on purchase_date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ account_id, amount, purchase_date, split_months }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const [{ data: accounts, error: aErr }, { data: rules, error: rErr }, { data: changes, error: cErr }] =
      await Promise.all([
        supabase.from("accounts").select("*"),
        supabase.from("financial_rules").select("*"),
        supabase.from("rule_changes").select("*"),
      ]);
    const err = aErr ?? rErr ?? cErr;
    if (err) return { content: [{ type: "text", text: err.message }], isError: true };

    const accountsTyped = (accounts ?? []) as unknown as Account[];
    const account = accountsTyped.find((a) => a.id === account_id);
    if (!account) return { content: [{ type: "text", text: "Account not found" }], isError: true };

    const months = split_months ?? 1;
    const perPayment = amount / months;
    const hypRule: FinancialRule = {
      id: "__hyp__",
      rule_type: months > 1 ? "expense" : "one_time",
      name: "Hypothetical purchase",
      source_account_id: account_id,
      destination_account_id: null,
      amount: perPayment,
      frequency: months > 1 ? "monthly" : "one_time",
      interval_count: null,
      day_of_week: null,
      day_of_month: null,
      start_date: purchase_date,
      end_date: null,
      occurrence_limit: months > 1 ? months : null,
      occurrences_completed: 0,
      category: null,
      essential: false,
      fixed_or_variable: "fixed",
      active: true,
      confidence_level: "high",
      notes: null,
    };

    const rulesTyped = (rules ?? []) as unknown as FinancialRule[];
    const changesTyped = (changes ?? []) as unknown as RuleChange[];
    const start = new Date();
    const end = addMonths(start, 12);

    const baseline = runForecast({ accounts: accountsTyped, rules: rulesTyped, changes: changesTyped, start, end });
    const withPurchase = runForecast({
      accounts: accountsTyped,
      rules: [...rulesTyped, hypRule],
      changes: changesTyped,
      start,
      end,
    });

    const baseLow = baseline.lowestByAccount[account_id];
    const newLow = withPurchase.lowestByAccount[account_id];
    const min = account.minimum_balance ?? 0;
    let verdict: "safe" | "warn" | "unsafe" = "safe";
    if (newLow.balance < min) verdict = "unsafe";
    else if (newLow.balance < min + amount * 0.25) verdict = "warn";

    const summary = {
      verdict,
      account: { id: account.id, name: account.name, minimum_balance: min },
      baseline_lowest: baseLow,
      projected_lowest: newLow,
      per_payment: perPayment,
      payments: months,
      as_of: format(start, "yyyy-MM-dd"),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});