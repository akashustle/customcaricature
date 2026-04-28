-- Homepage Builder: block-based fully editable homepage
CREATE TABLE IF NOT EXISTS public.homepage_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type TEXT NOT NULL,
  variant TEXT,
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_homepage_blocks_sort ON public.homepage_blocks(sort_order);
CREATE INDEX IF NOT EXISTS idx_homepage_blocks_visible ON public.homepage_blocks(is_visible);

ALTER TABLE public.homepage_blocks ENABLE ROW LEVEL SECURITY;

-- Public read of visible blocks (homepage is public)
CREATE POLICY "Anyone can read visible homepage blocks"
  ON public.homepage_blocks FOR SELECT
  USING (true);

-- Only admins can write
CREATE POLICY "Admins can insert homepage blocks"
  ON public.homepage_blocks FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update homepage blocks"
  ON public.homepage_blocks FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete homepage blocks"
  ON public.homepage_blocks FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_homepage_blocks_updated_at
  BEFORE UPDATE ON public.homepage_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_blocks;

-- Storage bucket for homepage assets (public for hero/section images)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('homepage-assets', 'homepage-assets', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Homepage assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'homepage-assets');

CREATE POLICY "Admins can upload homepage assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'homepage-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update homepage assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'homepage-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete homepage assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'homepage-assets' AND public.has_role(auth.uid(), 'admin'));