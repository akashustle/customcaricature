
-- Notify user when their event booking is created
CREATE OR REPLACE FUNCTION public.notify_user_new_event_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        '🎉 Event Booking Confirmed',
        'Your booking for ' || COALESCE(NEW.event_type, 'event') || ' on ' || NEW.event_date || ' is confirmed.',
        'event',
        '/dashboard'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_user_new_event_booking ON public.event_bookings;
CREATE TRIGGER trg_notify_user_new_event_booking
AFTER INSERT ON public.event_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_user_new_event_booking();

-- Notify user when they get verified (blue tick)
CREATE OR REPLACE FUNCTION public.notify_user_verification_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.is_verified,false) IS DISTINCT FROM COALESCE(OLD.is_verified,false) THEN
    BEGIN
      IF NEW.is_verified = true THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.user_id, '✅ You are now verified!',
                'Congrats! Your blue tick is active on Creative Caricature Club.',
                'broadcast', '/dashboard');
      ELSE
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.user_id, 'ℹ️ Verification updated',
                'Your verification status has changed. Open the app for details.',
                'broadcast', '/dashboard');
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  -- Notify on key profile changes
  IF (NEW.full_name IS DISTINCT FROM OLD.full_name)
     OR (NEW.mobile IS DISTINCT FROM OLD.mobile)
     OR (NEW.email IS DISTINCT FROM OLD.email)
     OR (NEW.address IS DISTINCT FROM OLD.address)
     OR (NEW.city IS DISTINCT FROM OLD.city)
     OR (NEW.state IS DISTINCT FROM OLD.state)
     OR (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id, '👤 Profile Updated',
              'Your profile details were updated successfully.',
              'broadcast', '/dashboard');
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_user_verification_change ON public.profiles;
CREATE TRIGGER trg_notify_user_verification_change
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_user_verification_change();
