-- 1. Profile verification fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS why_join text;

CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
  ON public.profiles (verification_status);

-- 2. Link workshop_users to auth users (booking account)
ALTER TABLE public.workshop_users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_workshop_users_auth_user
  ON public.workshop_users (auth_user_id);

-- 3. Profile verification history
CREATE TABLE IF NOT EXISTS public.profile_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  performed_by text,
  performed_by_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_verification_history_user
  ON public.profile_verification_history (user_id, created_at DESC);

ALTER TABLE public.profile_verification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own verification history" ON public.profile_verification_history;
CREATE POLICY "Users see own verification history"
  ON public.profile_verification_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage verification history" ON public.profile_verification_history;
CREATE POLICY "Admins manage verification history"
  ON public.profile_verification_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Service role full access verification history" ON public.profile_verification_history;
CREATE POLICY "Service role full access verification history"
  ON public.profile_verification_history
  FOR ALL
  USING (true)
  WITH CHECK (true);