
-- ============================================================================
-- Fix 1: workshop_users — remove public PII exposure, expose login/registration
--        helpers via SECURITY DEFINER RPCs that never return the password.
-- ============================================================================

-- Helper: verify workshop login credentials and return safe user record
CREATE OR REPLACE FUNCTION public.workshop_login(
  p_identifier text,
  p_identifier_type text,    -- 'email' | 'mobile'
  p_credential text,
  p_credential_type text     -- 'password' | 'secret_code' | 'none'
)
RETURNS TABLE (
  id uuid,
  name text,
  mobile text,
  email text,
  instagram_id text,
  age integer,
  occupation text,
  workshop_date date,
  slot text,
  student_type text,
  video_access_enabled boolean,
  video_download_allowed boolean,
  is_enabled boolean,
  gender text,
  roll_number integer,
  prefers_recorded boolean,
  workshop_id uuid,
  secret_code text,
  country text,
  state text,
  city text,
  district text,
  skill_level text,
  artist_background_type text,
  payment_status text,
  terms_accepted boolean,
  artist_background text,
  why_join text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user public.workshop_users%ROWTYPE;
BEGIN
  IF p_identifier_type = 'email' THEN
    SELECT * INTO v_user FROM public.workshop_users
      WHERE lower(email) = lower(trim(p_identifier))
      LIMIT 1;
  ELSIF p_identifier_type = 'mobile' THEN
    SELECT * INTO v_user FROM public.workshop_users
      WHERE mobile = trim(p_identifier)
      LIMIT 1;
  ELSE
    RETURN;
  END IF;

  IF v_user.id IS NULL THEN
    RETURN;
  END IF;

  -- Credential verification
  IF p_credential_type = 'password' THEN
    IF v_user.password IS NOT NULL AND v_user.password <> COALESCE(p_credential, '') THEN
      RETURN;
    END IF;
  ELSIF p_credential_type = 'secret_code' THEN
    IF v_user.secret_code IS NULL OR v_user.secret_code <> COALESCE(p_credential, '') THEN
      RETURN;
    END IF;
  ELSIF p_credential_type = 'none' THEN
    -- Allowed for legacy batches that don't require a password
    NULL;
  ELSE
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_user.id, v_user.name, v_user.mobile, v_user.email, v_user.instagram_id,
    v_user.age, v_user.occupation, v_user.workshop_date, v_user.slot,
    v_user.student_type, v_user.video_access_enabled, v_user.video_download_allowed,
    v_user.is_enabled, v_user.gender, v_user.roll_number, v_user.prefers_recorded,
    v_user.workshop_id, v_user.secret_code, v_user.country, v_user.state,
    v_user.city, v_user.district, v_user.skill_level, v_user.artist_background_type,
    v_user.payment_status, v_user.terms_accepted, v_user.artist_background, v_user.why_join;
END;
$$;

-- Helper: check whether a workshop registration already exists (duplicate check)
CREATE OR REPLACE FUNCTION public.workshop_user_exists(
  p_email text,
  p_mobile text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshop_users
    WHERE (p_email IS NOT NULL AND lower(email) = lower(trim(p_email)))
       OR (p_mobile IS NOT NULL AND mobile = trim(p_mobile))
  );
$$;

GRANT EXECUTE ON FUNCTION public.workshop_login(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_user_exists(text, text) TO anon, authenticated;

-- Remove the blanket public read policy that exposed all workshop user PII
DROP POLICY IF EXISTS "Anyone can view workshop users for login" ON public.workshop_users;

-- Allow workshop students to read their own row when their id is stored client-side.
-- (Reads are still gated: only admins can list everything; the RPC above handles login.)
-- Existing "Admins can manage workshop users" policy already covers admin access.

-- ============================================================================
-- Fix 2: lil_flea_gallery — restrict writes to admins only; keep public read.
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated manage lil_flea_gallery" ON public.lil_flea_gallery;

CREATE POLICY "Admins manage lil_flea_gallery"
  ON public.lil_flea_gallery
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
