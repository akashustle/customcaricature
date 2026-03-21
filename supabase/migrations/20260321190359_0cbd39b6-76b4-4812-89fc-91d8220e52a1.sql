
-- CMS pages table for editable legal/policy pages
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active cms pages" ON public.cms_pages FOR SELECT USING (true);
CREATE POLICY "Admins can manage cms pages" ON public.cms_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.cms_pages;

-- Calculator history table
CREATE TABLE public.calculator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_count integer,
  city text,
  region text,
  artist_count integer,
  suggested_price integer,
  action_taken text,
  clicked_link text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calculator_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert calculator sessions" ON public.calculator_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read calculator sessions" ON public.calculator_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.calculator_sessions;
