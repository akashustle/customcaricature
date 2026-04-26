
-- Fix infinite recursion between workshop_users <-> profiles sync triggers.
-- Two duplicate triggers existed for each sync function, AND each sync function
-- updates the OTHER table, which fires its sync back, exceeding stack depth.

-- 1) Drop duplicate triggers (keep one of each)
DROP TRIGGER IF EXISTS profiles_sync_to_workshop ON public.profiles;
DROP TRIGGER IF EXISTS workshop_users_sync_to_profile ON public.workshop_users;
DROP TRIGGER IF EXISTS mini_db_sync_profiles ON public.profiles;
DROP TRIGGER IF EXISTS mini_db_sync_workshop_users ON public.workshop_users;
DROP TRIGGER IF EXISTS on_profile_display_id ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_generate_display_id ON public.profiles;

-- 2) Recreate sync functions with depth guard so they only fire on top-level
--    user writes, never as a cascade from the sibling table's sync.
CREATE OR REPLACE FUNCTION public.sync_workshop_to_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_to_workshop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
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
$function$;

-- 3) Recreate single triggers
CREATE TRIGGER profiles_sync_to_workshop
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_workshop();

CREATE TRIGGER workshop_users_sync_to_profile
  AFTER INSERT OR UPDATE ON public.workshop_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_workshop_to_profile();

CREATE TRIGGER mini_db_sync_profiles
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

CREATE TRIGGER mini_db_sync_workshop_users
  AFTER INSERT OR UPDATE ON public.workshop_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

CREATE TRIGGER on_profile_display_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_display_id();

-- 4) Backfill: link Akash's existing workshop record now that recursion is fixed
UPDATE public.workshop_users
   SET auth_user_id = '524cbd26-9b45-4343-93ef-06be2c3cd9b0',
       updated_at = now()
 WHERE id = '343445c5-4e70-4dee-8fe4-a802351001d4'
   AND auth_user_id IS NULL;
