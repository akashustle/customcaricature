-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_pk TEXT,
  actor_id UUID,
  actor_role TEXT,
  changed_columns TEXT[],
  old_data JSONB,
  new_data JSONB,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_table ON public.admin_audit_log (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log (actor_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Generic audit trigger function
CREATE OR REPLACE FUNCTION public.fn_admin_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
  v_pk text;
  v_summary text;
  v_role text;
  v_old jsonb;
  v_new jsonb;
  v_key text;
  v_uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_pk := COALESCE((v_old->>'id'), '');
    v_summary := TG_TABLE_NAME || ' row deleted';
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_pk := COALESCE((v_new->>'id'), '');
    v_summary := TG_TABLE_NAME || ' row created';
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_pk := COALESCE((v_new->>'id'), (v_old->>'id'), '');

    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key NOT IN ('updated_at') AND (v_new->v_key) IS DISTINCT FROM (v_old->v_key) THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;

    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;

    v_summary := TG_TABLE_NAME || ' updated: ' || array_to_string(v_changed, ', ');
  END IF;

  IF v_uid IS NOT NULL AND public.has_role(v_uid, 'admin'::app_role) THEN
    v_role := 'admin';
  ELSIF v_uid IS NOT NULL THEN
    v_role := 'user';
  ELSE
    v_role := 'system';
  END IF;

  BEGIN
    INSERT INTO public.admin_audit_log
      (table_name, operation, row_pk, actor_id, actor_role, changed_columns, old_data, new_data, summary)
    VALUES
      (TG_TABLE_NAME, TG_OP, v_pk, v_uid, v_role, v_changed,
       CASE WHEN TG_OP <> 'INSERT' THEN v_old ELSE NULL END,
       CASE WHEN TG_OP <> 'DELETE' THEN v_new ELSE NULL END,
       v_summary);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit log insert failed (non-fatal): %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Attach trigger to key tables (idempotent, skip missing)
DO $$
DECLARE
  t text;
  audit_tables text[] := ARRAY[
    'admin_site_settings','content_blocks','homepage_blocks',
    'homepage_reviews','homepage_gallery','homepage_scroll_events',
    'homepage_trusted_brands','homepage_before_after','homepage_live_chat',
    'event_pricing','caricature_pricing','social_links','ui_settings','form_fields',
    'event_bookings','orders','enquiries','blog_posts'
  ];
BEGIN
  FOREACH t IN ARRAY audit_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_admin_audit_log()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- 4. Tighten broad UPDATE policies on workshop tables (column is user_id -> workshop_users.id)
DROP POLICY IF EXISTS "Anyone can update attendance" ON public.workshop_attendance;
CREATE POLICY "Update own attendance or admin"
ON public.workshop_attendance FOR UPDATE TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.workshop_users wu
    WHERE wu.id = workshop_attendance.user_id
      AND (wu.auth_user_id = auth.uid() OR auth.uid() IS NULL)
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update assignments" ON public.workshop_assignments;
CREATE POLICY "Update assignments admin or owner"
ON public.workshop_assignments FOR UPDATE TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.workshop_users wu
    WHERE wu.id = workshop_assignments.user_id
      AND (wu.auth_user_id = auth.uid() OR auth.uid() IS NULL)
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update own workshop notifications" ON public.workshop_notifications;
CREATE POLICY "Update own workshop notifications"
ON public.workshop_notifications FOR UPDATE TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.workshop_users wu
    WHERE wu.id = workshop_notifications.user_id
      AND (wu.auth_user_id = auth.uid() OR auth.uid() IS NULL)
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update locations" ON public.workshop_user_locations;
CREATE POLICY "Update own workshop location"
ON public.workshop_user_locations FOR UPDATE TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.workshop_users wu
    WHERE wu.id = workshop_user_locations.user_id
      AND (wu.auth_user_id = auth.uid() OR auth.uid() IS NULL)
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access verification history" ON public.profile_verification_history;
DROP POLICY IF EXISTS "Service role can do anything on verification history" ON public.workshop_verification_history;