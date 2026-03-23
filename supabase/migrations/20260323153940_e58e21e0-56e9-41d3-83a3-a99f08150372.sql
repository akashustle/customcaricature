
-- Admin activity logs with full audit trail (old_value/new_value)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT 'Admin',
  action_type text NOT NULL,
  module text NOT NULL DEFAULT 'general',
  target_id text,
  old_value jsonb,
  new_value jsonb,
  description text,
  ip_address text,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity logs"
  ON public.admin_activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs"
  ON public.admin_activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_activity_logs_admin ON public.admin_activity_logs (admin_id);
CREATE INDEX idx_activity_logs_module ON public.admin_activity_logs (module);
CREATE INDEX idx_activity_logs_created ON public.admin_activity_logs (created_at DESC);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS public.admin_failed_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  device_info text,
  reason text DEFAULT 'invalid_credentials',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_failed_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read failed logins"
  ON public.admin_failed_logins FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert failed logins"
  ON public.admin_failed_logins FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert failed logins"
  ON public.admin_failed_logins FOR INSERT TO anon
  WITH CHECK (true);

CREATE INDEX idx_failed_logins_email ON public.admin_failed_logins (email);
CREATE INDEX idx_failed_logins_created ON public.admin_failed_logins (created_at DESC);

-- Security alerts table
CREATE TABLE IF NOT EXISTS public.admin_security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  admin_id uuid,
  ip_address text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security alerts"
  ON public.admin_security_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_security_alerts_created ON public.admin_security_alerts (created_at DESC);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_security_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_failed_logins;
