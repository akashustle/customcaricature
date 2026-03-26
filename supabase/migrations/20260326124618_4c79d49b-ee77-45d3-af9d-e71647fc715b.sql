CREATE OR REPLACE FUNCTION public.trigger_web_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      )
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
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'OneSignal push trigger failed (non-fatal): %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  recent_count integer;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    SELECT COUNT(*) INTO recent_count
    FROM public.notifications
    WHERE user_id = admin_record.user_id
      AND title = '🆕 New User Registered'
      AND created_at > (now() - interval '5 minutes');
    
    IF recent_count < 3 THEN
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          admin_record.user_id,
          '🆕 New User Registered',
          'New user: ' || COALESCE(NEW.full_name, 'Unknown') || ' (' || COALESCE(NEW.email, '') || ')',
          'broadcast',
          '/admin-panel'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Admin notification failed: %', SQLERRM;
      END;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  recent_count integer;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    SELECT COUNT(*) INTO recent_count
    FROM public.notifications
    WHERE user_id = admin_record.user_id
      AND title = '🎉 New Event Booking'
      AND created_at > (now() - interval '2 minutes');
    
    IF recent_count < 2 THEN
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          admin_record.user_id,
          '🎉 New Event Booking',
          'Event by ' || COALESCE(NEW.client_name, 'Unknown') || ' on ' || NEW.event_date || ' at ' || COALESCE(NEW.city, 'Unknown'),
          'event',
          '/admin-panel'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Admin event notification failed: %', SQLERRM;
      END;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  recent_count integer;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    SELECT COUNT(*) INTO recent_count
    FROM public.notifications
    WHERE user_id = admin_record.user_id
      AND title = '📦 New Order Received'
      AND created_at > (now() - interval '2 minutes');
    
    IF recent_count < 2 THEN
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          admin_record.user_id,
          '📦 New Order Received',
          'Order from ' || COALESCE(NEW.customer_name, 'Unknown') || ' - ₹' || NEW.amount,
          'order',
          '/admin-panel'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Admin order notification failed: %', SQLERRM;
      END;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_enquiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  recent_count integer;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    SELECT COUNT(*) INTO recent_count
    FROM public.notifications
    WHERE user_id = admin_record.user_id
      AND title = '📝 New Enquiry'
      AND created_at > (now() - interval '2 minutes');
    
    IF recent_count < 3 THEN
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          admin_record.user_id,
          '📝 New Enquiry',
          'Enquiry from ' || COALESCE(NEW.name, 'Unknown') || ' (' || COALESCE(NEW.mobile, '') || ')',
          'broadcast',
          '/admin-panel'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Admin enquiry notification failed: %', SQLERRM;
      END;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;