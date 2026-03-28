-- Programmatic SEO landing pages table
CREATE TABLE public.seo_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  city text,
  service text NOT NULL,
  page_title text NOT NULL,
  meta_description text NOT NULL,
  h1_title text NOT NULL,
  intro_text text NOT NULL,
  body_content text NOT NULL DEFAULT '',
  keywords text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active SEO pages"
  ON public.seo_landing_pages
  FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_seo_landing_pages_updated_at
  BEFORE UPDATE ON public.seo_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();