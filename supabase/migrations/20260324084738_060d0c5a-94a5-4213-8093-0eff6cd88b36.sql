
-- Reversal Logs: master audit trail for every action
CREATE TABLE public.reversal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action_type TEXT NOT NULL,
  source_panel TEXT NOT NULL DEFAULT 'unknown',
  performed_by TEXT,
  role TEXT,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reversal Snapshots: before/after data for each log
CREATE TABLE public.reversal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES public.reversal_logs(id) ON DELETE CASCADE NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  full_snapshot JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reversal Actions: restore/permanent-delete actions taken on logs
CREATE TABLE public.reversal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES public.reversal_logs(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reversal Access Logs: track who accessed the console
CREATE TABLE public.reversal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  device TEXT,
  status TEXT NOT NULL DEFAULT 'fail',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.reversal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reversal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reversal_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reversal_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access reversal tables
CREATE POLICY "Admins full access reversal_logs" ON public.reversal_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access reversal_snapshots" ON public.reversal_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access reversal_actions" ON public.reversal_actions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Access logs: allow insert for anyone (to log failed attempts) but select only for admins
CREATE POLICY "Anyone can insert access logs" ON public.reversal_access_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read access logs" ON public.reversal_access_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_reversal_logs_entity ON public.reversal_logs(entity_type, entity_id);
CREATE INDEX idx_reversal_logs_action ON public.reversal_logs(action_type);
CREATE INDEX idx_reversal_logs_source ON public.reversal_logs(source_panel);
CREATE INDEX idx_reversal_logs_created ON public.reversal_logs(created_at DESC);
CREATE INDEX idx_reversal_snapshots_log ON public.reversal_snapshots(log_id);
CREATE INDEX idx_reversal_actions_log ON public.reversal_actions(log_id);
