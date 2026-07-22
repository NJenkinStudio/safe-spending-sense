
CREATE TABLE public.plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  institution_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plaid_items TO authenticated;
GRANT ALL ON public.plaid_items TO service_role;
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plaid_items" ON public.plaid_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER plaid_items_touch BEFORE UPDATE ON public.plaid_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.accounts
  ADD COLUMN plaid_item_id uuid REFERENCES public.plaid_items(id) ON DELETE SET NULL,
  ADD COLUMN plaid_account_id text,
  ADD COLUMN institution_name text,
  ADD COLUMN last_synced_at timestamptz;

CREATE UNIQUE INDEX accounts_plaid_account_unique
  ON public.accounts(user_id, plaid_account_id)
  WHERE plaid_account_id IS NOT NULL;
