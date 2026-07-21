
-- Add balance_as_of to accounts (defaults to today for existing rows)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS balance_as_of DATE NOT NULL DEFAULT CURRENT_DATE;

-- Data-integrity constraints for financial_rules
ALTER TABLE public.financial_rules
  DROP CONSTRAINT IF EXISTS financial_rules_rule_type_check,
  DROP CONSTRAINT IF EXISTS financial_rules_frequency_check,
  DROP CONSTRAINT IF EXISTS financial_rules_amount_check,
  DROP CONSTRAINT IF EXISTS financial_rules_day_of_week_check,
  DROP CONSTRAINT IF EXISTS financial_rules_day_of_month_check,
  DROP CONSTRAINT IF EXISTS financial_rules_interval_count_check,
  DROP CONSTRAINT IF EXISTS financial_rules_confidence_level_check,
  DROP CONSTRAINT IF EXISTS financial_rules_fixed_or_variable_check;

ALTER TABLE public.financial_rules
  ADD CONSTRAINT financial_rules_rule_type_check
    CHECK (rule_type IN ('income', 'expense', 'transfer', 'one_time')),
  ADD CONSTRAINT financial_rules_frequency_check
    CHECK (frequency IN ('one_time','weekly','biweekly','semimonthly','monthly','quarterly','annually','custom')),
  ADD CONSTRAINT financial_rules_amount_check
    CHECK (amount > 0),
  ADD CONSTRAINT financial_rules_day_of_week_check
    CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),
  ADD CONSTRAINT financial_rules_day_of_month_check
    CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),
  ADD CONSTRAINT financial_rules_interval_count_check
    CHECK (interval_count IS NULL OR interval_count >= 1),
  ADD CONSTRAINT financial_rules_confidence_level_check
    CHECK (confidence_level IN ('confirmed','likely','uncertain')),
  ADD CONSTRAINT financial_rules_fixed_or_variable_check
    CHECK (fixed_or_variable IN ('fixed','variable'));
