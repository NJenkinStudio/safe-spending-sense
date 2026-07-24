
-- Profiles: onboarding personalization fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS household_status text,
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 2;

-- Backfill onboarding_completed_at for existing users with at least one account,
-- so they are not force-redirected into the new onboarding.
UPDATE public.profiles p
SET onboarding_completed_at = now()
WHERE onboarding_completed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = p.id);

-- Identify demo-seeded records so they are removable independently.
ALTER TABLE public.accounts        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.financial_rules ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.rule_changes    ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS accounts_is_demo_idx        ON public.accounts (user_id) WHERE is_demo;
CREATE INDEX IF NOT EXISTS financial_rules_is_demo_idx ON public.financial_rules (user_id) WHERE is_demo;

-- Onboarding responses (1:1 with user)
CREATE TABLE IF NOT EXISTS public.onboarding_responses (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  money_management_style text,
  current_budgeting_app text,
  account_structure text,
  income_predictability text,
  spending_confidence text,
  bill_preparation_style text,
  primary_financial_goals text[] NOT NULL DEFAULT '{}',
  planning_goal_enabled boolean NOT NULL DEFAULT false,
  all_bills_added text,
  estimated_bills_remaining integer,
  all_income_sources_added text,
  estimated_income_sources_remaining integer,
  all_accounts_added text,
  account_setup_completeness text,
  current_step integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_responses TO authenticated;
GRANT ALL ON public.onboarding_responses TO service_role;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own onboarding_responses"
  ON public.onboarding_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER onboarding_responses_touch
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Planning goals
CREATE TABLE IF NOT EXISTS public.planning_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  amount_already_saved numeric NOT NULL DEFAULT 0 CHECK (amount_already_saved >= 0),
  desired_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_goals TO authenticated;
GRANT ALL ON public.planning_goals TO service_role;
ALTER TABLE public.planning_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own planning_goals"
  ON public.planning_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER planning_goals_touch
  BEFORE UPDATE ON public.planning_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS planning_goals_user_idx ON public.planning_goals (user_id);
