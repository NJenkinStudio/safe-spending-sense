import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase-for-user";

export default defineTool({
  name: "update_account_balance",
  title: "Update account balance",
  description:
    "Set an account's current balance and the balance_as_of date used as the forecast starting reference.",
  inputSchema: {
    account_id: z.string().uuid(),
    current_balance: z.number().describe("Current balance in dollars."),
    balance_as_of: z.string().describe("ISO date yyyy-MM-dd the balance is accurate as of."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ account_id, current_balance, balance_as_of }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("accounts")
      .update({ current_balance, balance_as_of })
      .eq("id", account_id)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Updated ${data.name}` }],
      structuredContent: { account: data },
    };
  },
});