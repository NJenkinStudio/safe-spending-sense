
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS setup_status TEXT NOT NULL DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS onboarding_version INTEGER NOT NULL DEFAULT 1;

UPDATE public.profiles
  SET setup_status = 'active'
  WHERE onboarding_completed_at IS NOT NULL AND setup_status <> 'active';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, setup_status, onboarding_version)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    'onboarding',
    1
  );
  RETURN NEW;
END;
$$;
