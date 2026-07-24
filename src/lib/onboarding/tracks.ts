import type { OnboardingResponses, SetupTrack } from "./types";

/** Decide which guided setup flow to show, based on habit answers. */
export function resolveTrack(r: OnboardingResponses): SetupTrack {
  if (r.income_predictability === "changes" || r.income_predictability === "multiple") {
    return "variable-income";
  }
  if (r.account_structure === "separate" || r.account_structure === "multiple") {
    return "bills-and-operating";
  }
  if (
    r.money_management_style === "still-figuring" ||
    r.money_management_style === "react-to-bills" ||
    r.spending_confidence === "rarely" ||
    r.spending_confidence === "almost-never"
  ) {
    return "new-to-budgeting";
  }
  return "single-account";
}

export const TRACK_COPY: Record<SetupTrack, { title: string; blurb: string }> = {
  "single-account": {
    title: "One primary account setup",
    blurb: "We'll add your main account, set a safety minimum, and capture your income and top bill.",
  },
  "bills-and-operating": {
    title: "Operating + bills account setup",
    blurb: "We'll set up both accounts, the transfers between them, and assign each bill to the right one.",
  },
  "variable-income": {
    title: "Flexible-income setup",
    blurb: "We'll capture your accounts and bills, then treat income conservatively so surprises hurt less.",
  },
  "new-to-budgeting": {
    title: "Getting-started setup",
    blurb: "We'll keep it to the essentials — one account, one paycheck, one or two big bills — and refine later.",
  },
};