-- Workshop registration drafts: incomplete sign-ups that have not paid yet.
CREATE TABLE IF NOT EXISTS public.workshop_registration_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  mobile text,
  current_step integer NOT NULL DEFAULT 0,
  form_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'workshop_signup',
  workshop_id uuid,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_drafts_email_idx
  ON public.workshop_registration_drafts (lower(email))
  WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workshop_drafts_mobile_idx
  ON public.workshop_registration_drafts (mobile)
  WHERE mobile IS NOT NULL;

ALTER TABLE public.workshop_registration_drafts ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors need to save / resume drafts before they have an account.
DROP POLICY IF EXISTS "Anyone can create a draft" ON public.workshop_registration_drafts;
CREATE POLICY "Anyone can create a draft"
  ON public.workshop_registration_drafts
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read drafts" ON public.workshop_registration_drafts;
CREATE POLICY "Anyone can read drafts"
  ON public.workshop_registration_drafts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can update their own draft" ON public.workshop_registration_drafts;
CREATE POLICY "Anyone can update their own draft"
  ON public.workshop_registration_drafts
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admins can delete drafts" ON public.workshop_registration_drafts;
CREATE POLICY "Admins can delete drafts"
  ON public.workshop_registration_drafts
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-touch updated_at
DROP TRIGGER IF EXISTS update_workshop_drafts_updated_at ON public.workshop_registration_drafts;
CREATE TRIGGER update_workshop_drafts_updated_at
  BEFORE UPDATE ON public.workshop_registration_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.workshop_registration_drafts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'workshop_registration_drafts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_registration_drafts';
  END IF;
END$$;