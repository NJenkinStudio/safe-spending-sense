import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase-for-user";

export default defineTool({
  name: "list_rules",
  title: "List financial rules",
  description: "List the signed-in user's income, expense, transfer, and one-time rules. Optionally filter by rule_type.",
  inputSchema: {
    rule_type: z
      .enum(["income", "expense", "transfer", "one_time"])
      .optional()
      .describe("Optional rule type filter."),
    active_only: z.boolean().optional().describe("If true, only return active rules."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ rule_type, active_only }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx).from("financial_rules").select("*").order("created_at");
    if (rule_type) q = q.eq("rule_type", rule_type);
    if (active_only) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { rules: data },
    };
  },
});