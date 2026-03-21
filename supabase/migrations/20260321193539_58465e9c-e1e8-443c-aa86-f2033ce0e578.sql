ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT NULL;
ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS secret_code TEXT DEFAULT NULL;

-- Generate secret codes for existing workshop users that don't have one
UPDATE public.workshop_users SET secret_code = lpad(floor(random() * 10000)::text, 4, '0') WHERE secret_code IS NULL;

-- Create trigger to auto-generate secret code on insert
CREATE OR REPLACE FUNCTION public.generate_workshop_secret_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.secret_code IS NULL THEN
    NEW.secret_code := lpad(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workshop_secret_code ON public.workshop_users;
CREATE TRIGGER trg_workshop_secret_code
  BEFORE INSERT ON public.workshop_users
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_workshop_secret_code();