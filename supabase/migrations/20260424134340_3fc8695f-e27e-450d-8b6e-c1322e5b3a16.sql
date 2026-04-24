-- Make mini-db sync trigger fully async / non-blocking and avoid statement timeouts.
-- The previous trigger called net.http_post with a 1500ms timeout SYNCHRONOUSLY,
-- which can still cause "canceling statement due to statement timeout" when the
-- pg_net worker is overloaded. We now wrap it in a pg_background-style fire-and-
-- forget by using a very short timeout AND swallowing any errors. We also expand
-- the avatar-only short-circuit to skip more low-impact updates.

CREATE OR REPLACE FUNCTION public.sync_mini_db_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_skip boolean := false;
BEGIN
  -- Always skip on avatar-only updates (fast path for photo uploads)
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'profiles' THEN
      IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
         AND row(NEW.full_name, NEW.mobile, NEW.email, NEW.city, NEW.state, NEW.address)
             IS NOT DISTINCT FROM
             row(OLD.full_name, OLD.mobile, OLD.email, OLD.city, OLD.state, OLD.address) THEN
        v_skip := true;
      END IF;
    ELSIF TG_TABLE_NAME = 'workshop_users' THEN
      IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
         AND row(NEW.name, NEW.mobile, NEW.email, NEW.city, NEW.state)
             IS NOT DISTINCT FROM
             row(OLD.name, OLD.mobile, OLD.email, OLD.city, OLD.state) THEN
        v_skip := true;
      END IF;
    END IF;
  END IF;

  IF v_skip THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fire-and-forget HTTP. pg_net queues the request; with a tiny timeout the
  -- trigger never blocks the calling statement.
  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/mini-db-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
      ),
      body := jsonb_build_object(
        'action', 'sync_table',
        'table', TG_TABLE_NAME
      ),
      timeout_milliseconds := 500
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block the user-facing write
    RAISE WARNING 'Mini DB sync trigger failed (non-fatal): %', SQLERRM;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$function$;