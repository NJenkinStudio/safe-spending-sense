export type StepId =
  | "about"
  | "what-is-cadence"
  | "habits"
  | "goal"
  | "summary"
  | "setup"
  | "completeness"
  | "buying-power"
  | "welcome";

export interface OnboardingProfile {
  first_name: string;
  last_name: string;
  preferred_name: string;
  age_range: string;
  occupation: string;
  employment_status: string;
  household_status: string;
  preferred_currency: string;
}

export interface OnboardingResponses {
  money_management_style: string;
  current_budgeting_app: string;
  account_structure: string;
  income_predictability: string;
  spending_confidence: string;
  bill_preparation_style: string;
  primary_financial_goals: string[];
  planning_goal_enabled: boolean;
  all_bills_added: string;
  estimated_bills_remaining: number | null;
  all_income_sources_added: string;
  estimated_income_sources_remaining: number | null;
  all_accounts_added: string;
  account_setup_completeness: string;
}

export interface PlanningGoalDraft {
  name: string;
  target_amount: string;
  amount_already_saved: string;
  desired_date: string;
  category: string;
}

export const EMPTY_PROFILE: OnboardingProfile = {
  first_name: "",
  last_name: "",
  preferred_name: "",
  age_range: "",
  occupation: "",
  employment_status: "",
  household_status: "",
  preferred_currency: "USD",
};

export const EMPTY_RESPONSES: OnboardingResponses = {
  money_management_style: "",
  current_budgeting_app: "",
  account_structure: "",
  income_predictability: "",
  spending_confidence: "",
  bill_preparation_style: "",
  primary_financial_goals: [],
  planning_goal_enabled: false,
  all_bills_added: "",
  estimated_bills_remaining: null,
  all_income_sources_added: "",
  estimated_income_sources_remaining: null,
  all_accounts_added: "",
  account_setup_completeness: "",
};

export const EMPTY_GOAL: PlanningGoalDraft = {
  name: "",
  target_amount: "",
  amount_already_saved: "0",
  desired_date: "",
  category: "",
};

export type SetupTrack =
  | "single-account"
  | "bills-and-operating"
  | "variable-income"
  | "new-to-budgeting";