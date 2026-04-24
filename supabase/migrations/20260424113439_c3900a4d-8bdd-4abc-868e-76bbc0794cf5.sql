-- 1. Toggle column
ALTER TABLE public.workshop_users
  ADD COLUMN IF NOT EXISTS sync_enabled boolean NOT NULL DEFAULT true;

-- 2. Workshop -> Profile mirror
CREATE OR REPLACE FUNCTION public.sync_workshop_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.auth_user_id IS NULL OR COALESCE(NEW.sync_enabled, true) = false THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET
    full_name    = COALESCE(NULLIF(NEW.name, ''), full_name),
    mobile       = COALESCE(NULLIF(NEW.mobile, ''), mobile),
    email        = COALESCE(NULLIF(NEW.email, ''), email),
    instagram_id = COALESCE(NEW.instagram_id, instagram_id),
    avatar_url   = COALESCE(NEW.avatar_url, avatar_url),
    country      = COALESCE(NEW.country, country),
    state        = COALESCE(NEW.state, state),
    district     = COALESCE(NEW.district, district),
    city         = COALESCE(NEW.city, city),
    age          = COALESCE(NEW.age, age),
    gender       = COALESCE(NEW.gender, gender),
    occupation   = COALESCE(NEW.occupation, occupation),
    updated_at   = now()
  WHERE user_id = NEW.auth_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workshop_users_sync_to_profile ON public.workshop_users;
CREATE TRIGGER workshop_users_sync_to_profile
AFTER INSERT OR UPDATE ON public.workshop_users
FOR EACH ROW EXECUTE FUNCTION public.sync_workshop_to_profile();

-- 3. Profile -> Workshop mirror (only for workshop-linked users with sync on)
CREATE OR REPLACE FUNCTION public.sync_profile_to_workshop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.workshop_users SET
    name         = COALESCE(NULLIF(NEW.full_name, ''), name),
    mobile       = COALESCE(NULLIF(NEW.mobile, ''), mobile),
    email        = COALESCE(NULLIF(NEW.email, ''), email),
    instagram_id = COALESCE(NEW.instagram_id, instagram_id),
    avatar_url   = COALESCE(NEW.avatar_url, avatar_url),
    country      = COALESCE(NEW.country, country),
    state        = COALESCE(NEW.state, state),
    district     = COALESCE(NEW.district, district),
    city         = COALESCE(NEW.city, city),
    age          = COALESCE(NEW.age, age),
    gender       = COALESCE(NEW.gender, gender),
    occupation   = COALESCE(NEW.occupation, occupation),
    updated_at   = now()
  WHERE auth_user_id = NEW.user_id
    AND COALESCE(sync_enabled, true) = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_to_workshop ON public.profiles;
CREATE TRIGGER profiles_sync_to_workshop
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_workshop();