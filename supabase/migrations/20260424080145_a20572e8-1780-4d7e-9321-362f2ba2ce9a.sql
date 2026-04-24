-- Update auto-completion RPC to also auto-mark currently-running events as 'live'
CREATE OR REPLACE FUNCTION public.auto_complete_past_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected integer := 0;
  live_affected integer := 0;
BEGIN
  -- Mark currently-running events as 'live'
  WITH live_updates AS (
    UPDATE public.event_bookings
       SET status = 'live',
           updated_at = now()
     WHERE status = 'upcoming'
       AND (event_date + event_start_time::time) <= now()
       AND (event_date + event_end_time::time) > now()
    RETURNING id
  )
  SELECT count(*) INTO live_affected FROM live_updates;

  -- Mark events whose end time has passed as 'completed'
  WITH updated AS (
    UPDATE public.event_bookings
       SET status = 'completed',
           updated_at = now()
     WHERE status NOT IN ('completed','cancelled')
       AND (event_date + event_end_time::time) < now()
    RETURNING id
  )
  SELECT count(*) INTO affected FROM updated;

  RETURN COALESCE(affected, 0) + COALESCE(live_affected, 0);
END;
$function$;