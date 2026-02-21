
-- Admin session tracking table
CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  device_info text,
  ip_address text,
  location_info text,
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sessions" ON public.admin_sessions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin action log table  
CREATE TABLE public.admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.admin_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage action log" ON public.admin_action_log
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat messages (ensure it's on)
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_action_log;
