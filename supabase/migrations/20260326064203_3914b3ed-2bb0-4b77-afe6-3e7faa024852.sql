
-- Function to auto-sync event to Google Sheet via edge function
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
        WHEN 'INSERT' THEN jsonb_build_object(
          'action', 'append_event',
          'event_data', row_to_json(NEW)::jsonb
        )
        WHEN 'UPDATE' THEN jsonb_build_object(
          'action', 'update_event',
          'event_id', NEW.id,
          'event_data', row_to_json(NEW)::jsonb
        )
      END
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Google Sheet sync trigger failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Trigger: auto-sync on new event booking
CREATE OR REPLACE TRIGGER on_event_sync_google_sheet_insert
  AFTER INSERT ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_to_google_sheet();

-- Trigger: auto-sync on event update
CREATE OR REPLACE TRIGGER on_event_sync_google_sheet_update
  AFTER UPDATE ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_to_google_sheet();
