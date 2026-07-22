import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { addMonths, parseISO } from "date-fns";
import { supabaseForUser, unauthenticated } from "../supabase-for-user";
import { runForecast } from "@/lib/forecast/engine";
import type { Account, FinancialRule, RuleChange } from "@/lib/forecast/types";

export default defineTool({
  name: "run_forecast",
  title: "Run cash-flow forecast",
  description:
    "Run the Cadence forecast engine for the signed-in user. Returns monthly inflow/outflow, ending balances, and the lowest projected balance per account.",
  inputSchema: {
    months: z.number().int().min(1).max(24).optional().describe("How many months forward to project. Default 12."),
    start_date: z.string().optional().describe("Optional ISO start date; defaults to today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ months, start_date }, ctx) => {
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
    const start = start_date ? parseISO(start_date) : new Date();
    const end = addMonths(start, months ?? 12);
    const result = runForecast({
      accounts: (accounts ?? []) as unknown as Account[],
      rules: (rules ?? []) as unknown as FinancialRule[],
      changes: (changes ?? []) as unknown as RuleChange[],
      start,
      end,
    });
    const summary = {
      monthly: result.monthly,
      endingBalances: result.endingBalances,
      lowestByAccount: result.lowestByAccount,
      negativeDatesByAccount: result.negativeDatesByAccount,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});