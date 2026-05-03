
-- Helper: first name lookup from profiles
CREATE OR REPLACE FUNCTION public.user_first_name(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(split_part(COALESCE(full_name,''),' ',1),''), 'there')
  FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Personalize: event booking confirmation
CREATE OR REPLACE FUNCTION public.notify_user_new_event_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    v_name := public.user_first_name(NEW.user_id);
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        '🎉 Booking confirmed, ' || v_name || '!',
        'Hey ' || v_name || ', your ' || COALESCE(NEW.event_type,'event') || ' on ' || NEW.event_date || ' is locked in. We will keep you posted.',
        'event','/dashboard'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;

-- Personalize: verification + profile change
CREATE OR REPLACE FUNCTION public.notify_user_verification_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  v_name := COALESCE(NULLIF(split_part(COALESCE(NEW.full_name,''),' ',1),''),'there');
  IF COALESCE(NEW.is_verified,false) IS DISTINCT FROM COALESCE(OLD.is_verified,false) THEN
    BEGIN
      IF NEW.is_verified = true THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.user_id, '✅ Congrats ' || v_name || ', you''re verified!',
                'Your blue tick is now active on Creative Caricature Club.',
                'broadcast','/dashboard');
      ELSE
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.user_id, 'ℹ️ ' || v_name || ', verification updated',
                'Open the app to see your updated verification status.',
                'broadcast','/dashboard');
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF (NEW.full_name IS DISTINCT FROM OLD.full_name)
     OR (NEW.mobile IS DISTINCT FROM OLD.mobile)
     OR (NEW.email IS DISTINCT FROM OLD.email)
     OR (NEW.address IS DISTINCT FROM OLD.address)
     OR (NEW.city IS DISTINCT FROM OLD.city)
     OR (NEW.state IS DISTINCT FROM OLD.state)
     OR (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id, '👤 ' || v_name || ', profile updated',
              'Your profile changes were saved successfully.',
              'broadcast','/dashboard');
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;

-- Personalize: order status / payment status
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  v_name := public.user_first_name(NEW.user_id);
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            '📦 ' || v_name || ', order update',
            'Hi ' || v_name || ', your order is now ' || REPLACE(NEW.status::text,'_',' ') || '.',
            'order','/dashboard');
  END IF;
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            '💳 ' || v_name || ', payment update',
            'Payment status: ' || COALESCE(NEW.payment_status,'unknown') || '.',
            'payment','/dashboard');
  END IF;
  RETURN NEW;
END $$;

-- Personalize: event status / payment status
CREATE OR REPLACE FUNCTION public.notify_event_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  v_name := public.user_first_name(NEW.user_id);
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            '🎪 ' || v_name || ', event update',
            'Hey ' || v_name || ', your event status changed to ' || NEW.status || '.',
            'event','/dashboard');
  END IF;
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            '💳 ' || v_name || ', event payment',
            'Event payment is now: ' || NEW.payment_status || '.',
            'payment','/dashboard');
  END IF;
  RETURN NEW;
END $$;

-- NEW: when a user submits an edit request, send them a "request sent" notification
CREATE OR REPLACE FUNCTION public.notify_user_edit_request_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  v_name := public.user_first_name(NEW.user_id);
  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
            '✉️ ' || v_name || ', edit request received',
            'Thanks ' || v_name || '! Your profile-edit request has been sent to admin. We''ll notify you the moment it''s reviewed.',
            'system','/dashboard');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_user_edit_request_submitted ON public.profile_edit_requests;
CREATE TRIGGER trg_notify_user_edit_request_submitted
AFTER INSERT ON public.profile_edit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_user_edit_request_submitted();

-- NEW: when admin approves/rejects, send the user a personalized push
CREATE OR REPLACE FUNCTION public.notify_user_edit_request_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_msg text; v_title text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;
  v_name := public.user_first_name(NEW.user_id);
  IF NEW.status = 'approved' THEN
    v_title := '✏️ ' || v_name || ', edit access granted';
    v_msg := 'Good news ' || v_name || '! Admin approved your request. You can now edit your profile ' ||
             COALESCE(NEW.edits_granted,1)::text || ' time' ||
             CASE WHEN COALESCE(NEW.edits_granted,1) > 1 THEN 's' ELSE '' END || '.';
  ELSE
    v_title := '❌ ' || v_name || ', edit request declined';
    v_msg := 'Sorry ' || v_name || ', admin couldn''t approve this request. ' || COALESCE(NEW.admin_response,'');
  END IF;
  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id, v_title, v_msg, 'system', '/dashboard');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_user_edit_request_decision ON public.profile_edit_requests;
CREATE TRIGGER trg_notify_user_edit_request_decision
AFTER UPDATE ON public.profile_edit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_user_edit_request_decision();
