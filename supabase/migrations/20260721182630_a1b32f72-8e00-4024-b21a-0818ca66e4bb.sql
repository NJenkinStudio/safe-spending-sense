
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking',
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  minimum_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  include_in_forecast BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL DEFAULT '#7A9A7E',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER accounts_touch BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Financial rules
CREATE TABLE public.financial_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rule_type TEXT NOT NULL, -- income | expense | transfer | one_time
  name TEXT NOT NULL,
  source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- one_time|weekly|biweekly|semimonthly|monthly|quarterly|annually|custom
  interval_count INT DEFAULT 1,
  day_of_week INT, -- 0-6
  day_of_month INT, -- 1-31
  start_date DATE NOT NULL,
  end_date DATE,
  occurrence_limit INT,
  occurrences_completed INT NOT NULL DEFAULT 0,
  category TEXT,
  essential BOOLEAN NOT NULL DEFAULT false,
  fixed_or_variable TEXT NOT NULL DEFAULT 'fixed',
  active BOOLEAN NOT NULL DEFAULT true,
  confidence_level TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_rules TO authenticated;
GRANT ALL ON public.financial_rules TO service_role;
ALTER TABLE public.financial_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules" ON public.financial_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER rules_touch BEFORE UPDATE ON public.financial_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Rule changes
CREATE TABLE public.rule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  financial_rule_id UUID NOT NULL REFERENCES public.financial_rules(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rule_changes TO authenticated;
GRANT ALL ON public.rule_changes TO service_role;
ALTER TABLE public.rule_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rule_changes" ON public.rule_changes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Safety rules
CREATE TABLE public.safety_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  minimum_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  required_days_funded INT NOT NULL DEFAULT 14,
  prevent_negative_balance BOOLEAN NOT NULL DEFAULT true,
  emergency_fund_target NUMERIC(14,2) DEFAULT 0,
  include_uncertain_income BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_rules TO authenticated;
GRANT ALL ON public.safety_rules TO service_role;
ALTER TABLE public.safety_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own safety" ON public.safety_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER safety_touch BEFORE UPDATE ON public.safety_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
