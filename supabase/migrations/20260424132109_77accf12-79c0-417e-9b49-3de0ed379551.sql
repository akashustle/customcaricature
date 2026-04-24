-- Make sync_mini_db_on_change non-blocking with a short HTTP timeout and a
-- payload that does not block the calling transaction. Also avoid firing on
-- avatar-only updates (which are very frequent and don't need backup sync).

CREATE OR REPLACE FUNCTION public.sync_mini_db_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_skip boolean := false;
BEGIN
  -- Skip avatar-only updates on profiles & workshop_users to keep avatar
  -- saves snappy and avoid statement timeout when the sheet API is slow.
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
      timeout_milliseconds := 1500
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Mini DB sync trigger failed (non-fatal): %', SQLERRM;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Same hardening for trigger_web_push: short timeouts so the UPDATE of
-- profile fields that creates a notification can never hang for 2 minutes.
CREATE OR REPLACE FUNCTION public.trigger_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.notifications
  WHERE user_id = NEW.user_id
    AND title = NEW.title
    AND id != NEW.id
    AND created_at > (now() - interval '60 seconds');

  IF recent_count > 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-web-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'type', NEW.type,
        'link', NEW.link
      ),
      timeout_milliseconds := 1500
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Web push trigger failed (non-fatal): %', SQLERRM;
  END;

  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-onesignal',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
      ),
      body := jsonb_build_object(
        'user_ids', jsonb_build_array(NEW.user_id),
        'title', NEW.title,
        'message', NEW.message,
        'url', COALESCE(NEW.link, '/notifications')
      ),
      timeout_milliseconds := 1500
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'OneSignal push trigger failed (non-fatal): %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Same hardening for sync_event_to_google_sheet
CREATE OR REPLACE FUNCTION public.sync_event_to_google_sheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/google-sheets-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
      ),
      body := CASE TG_OP
        WHEN 'INSERT' THEN jsonb_build_object('action','append_event','event_data', row_to_json(NEW)::jsonb)
        WHEN 'UPDATE' THEN jsonb_build_object('action','update_event','event_id', NEW.id, 'event_data', row_to_json(NEW)::jsonb)
      END,
      timeout_milliseconds := 1500
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Google Sheet sync trigger failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
