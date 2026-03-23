
-- Admin risk scores table
CREATE TABLE IF NOT EXISTS public.admin_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  failed_logins INTEGER NOT NULL DEFAULT 0,
  suspicious_edits INTEGER NOT NULL DEFAULT 0,
  unusual_behavior INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id)
);

-- AI monitoring alerts table
CREATE TABLE IF NOT EXISTS public.admin_ai_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  admin_name TEXT,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  suggestion TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ai_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_risk_scores' AND policyname = 'Admins can view risk scores') THEN
    CREATE POLICY "Admins can view risk scores" ON public.admin_risk_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_risk_scores' AND policyname = 'Admins can manage risk scores') THEN
    CREATE POLICY "Admins can manage risk scores" ON public.admin_risk_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_ai_alerts' AND policyname = 'Admins can view ai alerts') THEN
    CREATE POLICY "Admins can view ai alerts" ON public.admin_ai_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_ai_alerts' AND policyname = 'Admins can manage ai alerts') THEN
    CREATE POLICY "Admins can manage ai alerts" ON public.admin_ai_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_risk_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_ai_alerts;
