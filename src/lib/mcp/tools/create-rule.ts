import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase-for-user";

export default defineTool({
  name: "create_rule",
  title: "Create financial rule",
  description:
    "Create a new income, expense, transfer, or one-time rule for the signed-in user. Amount must be positive; the rule engine assigns sign based on rule_type.",
  inputSchema: {
    name: z.string().min(1).describe("Short name for the rule, e.g. 'Rent' or 'Paycheck'."),
    rule_type: z.enum(["income", "expense", "transfer", "one_time"]),
    amount: z.number().positive().describe("Positive amount in dollars."),
    frequency: z.enum([
      "one_time",
      "weekly",
      "biweekly",
      "semimonthly",
      "monthly",
      "quarterly",
      "annually",
      "custom",
    ]),
    start_date: z.string().describe("ISO date yyyy-MM-dd of the first occurrence."),
    end_date: z.string().optional().describe("Optional ISO date yyyy-MM-dd for the last allowed occurrence."),
    source_account_id: z.string().uuid().optional().describe("Account debited (expense/transfer)."),
    destination_account_id: z.string().uuid().optional().describe("Account credited (income/transfer)."),
    day_of_week: z.number().int().min(0).max(6).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    occurrence_limit: z.number().int().positive().optional(),
    category: z.string().optional(),
    essential: z.boolean().optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    if (!userId) return unauthenticated();
    const row = {
      user_id: userId,
      name: input.name,
      rule_type: input.rule_type,
      amount: input.amount,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      source_account_id: input.source_account_id ?? null,
      destination_account_id: input.destination_account_id ?? null,
      day_of_week: input.day_of_week ?? null,
      day_of_month: input.day_of_month ?? null,
      occurrence_limit: input.occurrence_limit ?? null,
      category: input.category ?? null,
      essential: input.essential ?? false,
      notes: input.notes ?? null,
      active: true,
    };
    const { data, error } = await supabase.from("financial_rules").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created rule ${data.id}` }],
      structuredContent: { rule: data },
    };
  },
});