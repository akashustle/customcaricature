
-- Online attendance prompts table
CREATE TABLE IF NOT EXISTS public.workshop_online_attendance_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL DEFAULT '6pm-9pm',
  session_date date NOT NULL,
  timing text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_online_attendance_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage online attendance prompts" ON public.workshop_online_attendance_prompts
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view online attendance prompts" ON public.workshop_online_attendance_prompts
  FOR SELECT TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_online_attendance_prompts;

-- SEO settings table for admin page-level SEO control
CREATE TABLE IF NOT EXISTS public.seo_page_settings (
  id text PRIMARY KEY,
  page_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  seo_keywords text NOT NULL DEFAULT '',
  og_title text,
  og_description text,
  og_image text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SEO settings" ON public.seo_page_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read SEO settings" ON public.seo_page_settings
  FOR SELECT TO public USING (true);
