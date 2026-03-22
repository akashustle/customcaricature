
-- WhatsApp/automation message templates
CREATE TABLE IF NOT EXISTS public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  label text NOT NULL,
  message_body text NOT NULL,
  category text DEFAULT 'whatsapp',
  is_enabled boolean DEFAULT true,
  delay_minutes integer DEFAULT 0,
  trigger_event text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation_templates" ON public.automation_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read automation_templates" ON public.automation_templates
  FOR SELECT TO anon USING (true);

-- Sales scripts
CREATE TABLE IF NOT EXISTS public.sales_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  script_body text NOT NULL,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sales_scripts" ON public.sales_scripts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Funnel analytics tracking
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source text DEFAULT 'direct',
  session_id text,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert funnel events" ON public.funnel_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read funnel events" ON public.funnel_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_scripts;
