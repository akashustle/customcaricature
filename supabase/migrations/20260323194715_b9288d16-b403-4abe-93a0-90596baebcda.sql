
-- Before/After gallery table
CREATE TABLE public.before_after_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.before_after_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view before_after_gallery" ON public.before_after_gallery
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage before_after_gallery" ON public.before_after_gallery
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for before_after_gallery
ALTER PUBLICATION supabase_realtime ADD TABLE public.before_after_gallery;
