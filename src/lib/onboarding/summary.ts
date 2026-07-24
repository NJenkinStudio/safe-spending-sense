import type { OnboardingResponses } from "./types";

/** Generate a short, supportive, non-judgemental summary from habit answers. */
export function buildSummary(r: OnboardingResponses, goalName?: string | null): string[] {
  const out: string[] = [];

  switch (r.money_management_style) {
    case "written-budget":
      out.push("You already use a budgeting system. Cadence will help you turn it into a forward-looking forecast instead of only tracking what has already happened.");
      break;
    case "another-app":
      out.push("You already use a budgeting app. Cadence will add a projection layer on top so you can see what tomorrow looks like, not just today.");
      break;
    case "mental":
      out.push("You keep a mental picture of your money. Cadence will make that picture concrete so you can double-check your instincts before big decisions.");
      break;
    case "check-balance":
      out.push("You currently make many decisions from your account balance. Cadence will help separate money available today from money your future already needs.");
      break;
    case "react-to-bills":
      out.push("You mostly react to bills as they arrive. Cadence will surface them a step earlier so nothing catches you off guard.");
      break;
    case "still-figuring":
      out.push("You're still figuring out a system. Cadence will start simple and grow with you — no scoring, no grading.");
      break;
  }

  switch (r.account_structure) {
    case "separate":
    case "multiple":
      out.push("You use separate accounts for bills and everyday spending. Cadence will help coordinate those accounts and protect money assigned to upcoming bills.");
      break;
  }

  if (r.income_predictability === "changes" || r.income_predictability === "multiple") {
    out.push("Your income changes frequently. Cadence will focus on flexible forecasting so your plan can adjust as your income changes.");
  } else if (r.income_predictability === "none") {
    out.push("You don't have regular income right now. Cadence will focus on what's already in your accounts and how far it can safely go.");
  }

  if (r.spending_confidence === "rarely" || r.spending_confidence === "almost-never") {
    out.push("Knowing what's safe to spend is a big part of what Cadence does — that's exactly the question Buying Power answers.");
  }

  if (goalName) {
    out.push(`You want to save for ${goalName}. Cadence will help you see how today's spending choices affect when that purchase fits safely into your plan.`);
  }

  return out;
}