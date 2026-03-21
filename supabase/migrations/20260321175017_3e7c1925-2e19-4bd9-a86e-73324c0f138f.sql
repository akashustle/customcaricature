
-- Event gallery table
CREATE TABLE public.event_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view event gallery" ON public.event_gallery FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage event gallery" ON public.event_gallery FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Caricature gallery table
CREATE TABLE public.caricature_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.caricature_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view caricature gallery" ON public.caricature_gallery FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage caricature gallery" ON public.caricature_gallery FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
