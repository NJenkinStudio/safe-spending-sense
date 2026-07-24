
TRUNCATE TABLE public.rule_changes, public.financial_rules, public.safety_rules, public.planning_goals, public.onboarding_responses, public.plaid_items, public.accounts RESTART IDENTITY CASCADE;

UPDATE public.profiles
SET setup_status = 'onboarding',
    onboarding_completed_at = NULL,
    onboarding_version = 1,
    first_name = NULL,
    last_name = NULL,
    preferred_name = NULL,
    age_range = NULL,
    occupation = NULL,
    employment_status = NULL,
    household_status = NULL;
