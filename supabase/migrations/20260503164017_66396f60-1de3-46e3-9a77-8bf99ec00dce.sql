CREATE OR REPLACE FUNCTION public.notify_event_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_name text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  v_name := public.user_first_name(NEW.user_id);

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            CASE NEW.status
              WHEN 'live' THEN '🔴 ' || v_name || ', your event is LIVE!'
              WHEN 'completed' THEN '✅ ' || v_name || ', event completed'
              WHEN 'cancelled' THEN '❌ ' || v_name || ', event cancelled'
              ELSE '🎪 ' || v_name || ', event update'
            END,
            CASE NEW.status
              WHEN 'live' THEN 'Hey ' || v_name || ', your event has just started. Hope you have an amazing time!'
              WHEN 'completed' THEN 'Hi ' || v_name || ', your event is now marked complete. Thank you for booking with us!'
              ELSE 'Hey ' || v_name || ', your event status changed to ' || NEW.status || '.'
            END,
            'event','/dashboard');

    -- Post-event balance-due reminder
    IF NEW.status = 'completed'
       AND COALESCE(NEW.payment_status,'') NOT IN ('fully_paid','paid','completed') THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id,
              '💰 ' || v_name || ', balance payment pending',
              'Hi ' || v_name || ', please settle the remaining balance and confirm event details to close out your booking.',
              'payment','/dashboard');
    END IF;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            '💳 ' || v_name || ', event payment',
            'Event payment is now: ' || NEW.payment_status || '.',
            'payment','/dashboard');
  END IF;
  RETURN NEW;
END $function$;