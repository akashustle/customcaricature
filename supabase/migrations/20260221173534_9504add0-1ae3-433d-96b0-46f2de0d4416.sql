
-- Fix the trigger_web_push function to not crash when pg_net is unavailable
-- Use a BEGIN/EXCEPTION block so the notification trigger never breaks the parent transaction
CREATE OR REPLACE FUNCTION public.trigger_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-web-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'type', NEW.type,
        'link', NEW.link
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail - web push is best-effort, should never block transactions
    RAISE WARNING 'Web push trigger failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
