
-- 1. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  admin_updates boolean NOT NULL DEFAULT true,
  admin_contact_replies boolean NOT NULL DEFAULT true,
  emi_due_dates boolean NOT NULL DEFAULT true,
  credit_card_bills boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own prefs select" ON public.notification_preferences;
DROP POLICY IF EXISTS "own prefs upsert" ON public.notification_preferences;
DROP POLICY IF EXISTS "own prefs update" ON public.notification_preferences;
CREATE POLICY "own prefs select" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own prefs upsert" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- 2. contact_submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  mobile text,
  subject text,
  message text NOT NULL,
  who_are_you text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_subs_email ON public.contact_submissions (lower(email));
CREATE INDEX IF NOT EXISTS idx_contact_subs_user ON public.contact_submissions (user_id);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone insert contact" ON public.contact_submissions;
DROP POLICY IF EXISTS "owner or admin read contact" ON public.contact_submissions;
DROP POLICY IF EXISTS "admins manage contact" ON public.contact_submissions;
CREATE POLICY "anyone insert contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "owner or admin read contact" ON public.contact_submissions FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR
  user_id = auth.uid() OR
  lower(email) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
);
CREATE POLICY "admins manage contact" ON public.contact_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete contact" ON public.contact_submissions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 3. contact_replies
CREATE TABLE IF NOT EXISTS public.contact_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  sender_id uuid,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  read_at timestamptz,
  read_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_replies_sub ON public.contact_replies (submission_id, created_at);
ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_owns_contact_submission(_user_id uuid, _sub_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contact_submissions s
    WHERE s.id = _sub_id
      AND (s.user_id = _user_id
           OR lower(s.email) = lower(coalesce((SELECT email FROM auth.users WHERE id = _user_id), '')))
  )
$$;

DROP POLICY IF EXISTS "owner or admin read replies" ON public.contact_replies;
DROP POLICY IF EXISTS "owner or admin insert replies" ON public.contact_replies;
DROP POLICY IF EXISTS "owner or admin update replies" ON public.contact_replies;
CREATE POLICY "owner or admin read replies" ON public.contact_replies FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.user_owns_contact_submission(auth.uid(), submission_id)
);
CREATE POLICY "owner or admin insert replies" ON public.contact_replies FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.user_owns_contact_submission(auth.uid(), submission_id)
);
CREATE POLICY "owner or admin update replies" ON public.contact_replies FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.user_owns_contact_submission(auth.uid(), submission_id)
);

-- 4. trigger: notify admins on new contact submission
CREATE OR REPLACE FUNCTION public.notify_admins_new_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (r.user_id, '✉️ New Contact Message',
              COALESCE(NEW.name,'Someone') || ' — ' || COALESCE(NEW.subject, left(NEW.message, 60)),
              'broadcast', '/admin-panel?tab=contact');
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_admins_new_contact ON public.contact_submissions;
CREATE TRIGGER trg_notify_admins_new_contact
  AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_contact();

-- 5. trigger: notify admins on new user profile
CREATE OR REPLACE FUNCTION public.notify_admins_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (r.user_id, '🆕 New User Registered',
              COALESCE(NEW.full_name,'A new user') || ' (' || COALESCE(NEW.email,'') || ') just joined',
              'broadcast', '/admin-panel?tab=users');
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_admins_new_user_profile ON public.profiles;
CREATE TRIGGER trg_notify_admins_new_user_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_user_profile();

-- 6. trigger: notify user when admin replies to a contact thread
CREATE OR REPLACE FUNCTION public.notify_user_on_admin_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_email text;
BEGIN
  IF NEW.is_admin = false THEN
    -- notify all admins about user reply
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, '💬 User replied', left(NEW.body, 120), 'chat', '/admin-panel?tab=contact'
    FROM public.user_roles ur WHERE ur.role = 'admin';
    RETURN NEW;
  END IF;

  SELECT s.user_id, s.email INTO v_owner, v_email FROM public.contact_submissions s WHERE s.id = NEW.submission_id;
  IF v_owner IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_owner FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;
  END IF;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_owner, '💬 New reply from support', left(NEW.body, 120), 'chat', '/support');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_user_on_admin_reply ON public.contact_replies;
CREATE TRIGGER trg_notify_user_on_admin_reply
  AFTER INSERT ON public.contact_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_admin_reply();

-- 7. mark replies read RPC
CREATE OR REPLACE FUNCTION public.mark_contact_replies_read(_submission_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    UPDATE public.contact_replies SET read_at = now(), read_by = auth.uid()
      WHERE submission_id = _submission_id AND is_admin = false AND read_at IS NULL;
  ELSIF public.user_owns_contact_submission(auth.uid(), _submission_id) THEN
    UPDATE public.contact_replies SET read_at = now(), read_by = auth.uid()
      WHERE submission_id = _submission_id AND is_admin = true AND read_at IS NULL;
  END IF;
END $$;

-- 8. realtime publication
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_submissions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_replies; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.notification_preferences REPLICA IDENTITY FULL;
ALTER TABLE public.contact_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.contact_replies REPLICA IDENTITY FULL;
