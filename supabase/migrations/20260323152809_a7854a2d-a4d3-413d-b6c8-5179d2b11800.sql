
-- Content blocks: editable text/content on any page
CREATE TABLE public.content_blocks (
  id text PRIMARY KEY,
  page text NOT NULL DEFAULT 'global',
  block_type text NOT NULL DEFAULT 'text',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read content blocks" ON public.content_blocks FOR SELECT USING (true);
CREATE POLICY "Admins can manage content blocks" ON public.content_blocks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Form fields: dynamic form builder
CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text NOT NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  placeholder text,
  options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  validation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, field_key)
);
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read form fields" ON public.form_fields FOR SELECT USING (true);
CREATE POLICY "Admins can manage form fields" ON public.form_fields FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UI settings: design control (colors, fonts, logos)
CREATE TABLE public.ui_settings (
  id text PRIMARY KEY,
  category text NOT NULL DEFAULT 'general',
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
ALTER TABLE public.ui_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ui settings" ON public.ui_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage ui settings" ON public.ui_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for all three
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_fields;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ui_settings;
