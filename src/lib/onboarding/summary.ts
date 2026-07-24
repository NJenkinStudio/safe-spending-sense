import type { OnboardingResponses } from "./types";

/** Short, scannable confirmation bullets. HTML-safe (only <strong> is used). */
export function buildSummaryBullets(r: OnboardingResponses, goalName?: string | null): string[] {
  const out: string[] = [];

  switch (r.money_management_style) {
    case "written-budget": out.push("You already use a budgeting system."); break;
    case "another-app": out.push("You already use a budgeting app."); break;
    case "mental": out.push("You keep a mental picture of your money."); break;
    case "check-balance": out.push("You primarily spend from your account balance."); break;
    case "react-to-bills": out.push("You react to bills as they arrive."); break;
    case "still-figuring": out.push("You're still figuring out a system."); break;
  }

  if (r.account_structure === "separate" || r.account_structure === "multiple") {
    out.push("You separate bills from spending.");
  } else if (r.account_structure === "single") {
    out.push("You use one main account.");
  }

  switch (r.income_predictability) {
    case "changes":
    case "multiple":
      out.push("Your income varies."); break;
    case "none":
      out.push("No regular income right now."); break;
    case "regular":
      out.push("You have a regular paycheck."); break;
  }

  if (r.spending_confidence === "rarely" || r.spending_confidence === "almost-never") {
    out.push("You want a clearer sense of what's safe to spend.");
  }

  if (goalName) {
    out.push(`You're planning to save for: <strong>${escapeHtml(goalName)}</strong>`);
  }

  return out;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Backwards-compat re-export (not used elsewhere but avoids accidental import breakage).
export const buildSummary = buildSummaryBullets;