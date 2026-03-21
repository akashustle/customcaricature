-- Scroll event images table for homepage slideshow
CREATE TABLE public.scroll_event_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.scroll_event_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view scroll event images" ON public.scroll_event_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage scroll event images" ON public.scroll_event_images FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Homepage reviews managed from admin
CREATE TABLE public.homepage_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  review_text text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  designation text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.homepage_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view homepage reviews" ON public.homepage_reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can manage homepage reviews" ON public.homepage_reviews FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Trusted brands/logos section
CREATE TABLE public.trusted_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  category text DEFAULT 'brand',
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trusted_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trusted brands" ON public.trusted_brands FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can manage trusted brands" ON public.trusted_brands FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scroll_event_images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trusted_brands;