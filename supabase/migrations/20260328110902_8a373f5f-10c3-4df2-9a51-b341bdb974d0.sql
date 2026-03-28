
CREATE TABLE public.lil_flea_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lil_flea_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read lil_flea_gallery" ON public.lil_flea_gallery
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage lil_flea_gallery" ON public.lil_flea_gallery
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lil_flea_gallery;
