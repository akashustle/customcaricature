
CREATE OR REPLACE FUNCTION public.sync_mini_db_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Mini DB sync trigger failed (non-fatal): %', SQLERRM;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Trigger on profiles (INSERT/UPDATE only - no DELETE sync)
CREATE TRIGGER mini_db_sync_profiles
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

-- Trigger on payment_history
CREATE TRIGGER mini_db_sync_payment_history
  AFTER INSERT OR UPDATE ON public.payment_history
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

-- Trigger on event_bookings
CREATE TRIGGER mini_db_sync_event_bookings
  AFTER INSERT OR UPDATE ON public.event_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

-- Trigger on orders
CREATE TRIGGER mini_db_sync_orders
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

-- Trigger on enquiries
CREATE TRIGGER mini_db_sync_enquiries
  AFTER INSERT OR UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();

-- Trigger on workshop_users
CREATE TRIGGER mini_db_sync_workshop_users
  AFTER INSERT OR UPDATE ON public.workshop_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_mini_db_on_change();
