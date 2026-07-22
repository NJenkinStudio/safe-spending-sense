import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAccountsTool from "./tools/list-accounts";
import listRulesTool from "./tools/list-rules";
import createRuleTool from "./tools/create-rule";
import updateAccountBalanceTool from "./tools/update-account-balance";
import runForecastTool from "./tools/run-forecast";
import canIAffordTool from "./tools/can-i-afford";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cadence-mcp",
  title: "Cadence Personal Finance",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Cadence user's personal finance data. Read accounts and rules (income, expenses, transfers, bills), add new rules, update an account's balance, run the 12-month forecast, and evaluate whether a purchase is safe against projected balances.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listAccountsTool,
    listRulesTool,
    createRuleTool,
    updateAccountBalanceTool,
    runForecastTool,
    canIAffordTool,
  ],
});