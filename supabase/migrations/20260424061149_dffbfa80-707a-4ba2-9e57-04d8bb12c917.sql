-- Fix ambiguous column references in workshop_login by qualifying all OUT columns.
CREATE OR REPLACE FUNCTION public.workshop_login(p_identifier text, p_identifier_type text, p_credential text, p_credential_type text)
 RETURNS TABLE(id uuid, name text, mobile text, email text, instagram_id text, age integer, occupation text, workshop_date date, slot text, student_type text, video_access_enabled boolean, video_download_allowed boolean, is_enabled boolean, gender text, roll_number integer, prefers_recorded boolean, workshop_id uuid, secret_code text, country text, state text, city text, district text, skill_level text, artist_background_type text, payment_status text, terms_accepted boolean, artist_background text, why_join text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.workshop_users%ROWTYPE;
BEGIN
  IF p_identifier_type = 'email' THEN
    SELECT wu.* INTO v_user FROM public.workshop_users wu
      WHERE lower(wu.email) = lower(trim(p_identifier))
      LIMIT 1;
  ELSIF p_identifier_type = 'mobile' THEN
    SELECT wu.* INTO v_user FROM public.workshop_users wu
      WHERE wu.mobile = trim(p_identifier)
      LIMIT 1;
  ELSE
    RETURN;
  END IF;

  IF v_user.id IS NULL THEN
    RETURN;
  END IF;

  IF p_credential_type = 'password' THEN
    IF v_user.password IS NOT NULL AND v_user.password <> COALESCE(p_credential, '') THEN
      RETURN;
    END IF;
  ELSIF p_credential_type = 'secret_code' THEN
    IF v_user.secret_code IS NULL OR v_user.secret_code <> COALESCE(p_credential, '') THEN
      RETURN;
    END IF;
  ELSIF p_credential_type = 'none' THEN
    NULL;
  ELSE
    RETURN;
  END IF;

  id := v_user.id;
  name := v_user.name;
  mobile := v_user.mobile;
  email := v_user.email;
  instagram_id := v_user.instagram_id;
  age := v_user.age;
  occupation := v_user.occupation;
  workshop_date := v_user.workshop_date;
  slot := v_user.slot;
  student_type := v_user.student_type;
  video_access_enabled := v_user.video_access_enabled;
  video_download_allowed := v_user.video_download_allowed;
  is_enabled := v_user.is_enabled;
  gender := v_user.gender;
  roll_number := v_user.roll_number;
  prefers_recorded := v_user.prefers_recorded;
  workshop_id := v_user.workshop_id;
  secret_code := v_user.secret_code;
  country := v_user.country;
  state := v_user.state;
  city := v_user.city;
  district := v_user.district;
  skill_level := v_user.skill_level;
  artist_background_type := v_user.artist_background_type;
  payment_status := v_user.payment_status;
  terms_accepted := v_user.terms_accepted;
  artist_background := v_user.artist_background;
  why_join := v_user.why_join;
  RETURN NEXT;
END;
$function$;