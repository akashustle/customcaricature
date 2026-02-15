
-- Custom pricing per customer for caricatures
CREATE TABLE public.customer_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caricature_type_slug TEXT NOT NULL,
  custom_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, caricature_type_slug)
);

ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer pricing" ON public.customer_pricing FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own pricing" ON public.customer_pricing FOR SELECT USING (auth.uid() = user_id);

-- Artists table
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  experience TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage artists" ON public.artists FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view artists" ON public.artists FOR SELECT USING (true);

-- Add assigned artist to event bookings
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS assigned_artist_id UUID REFERENCES public.artists(id);

-- Storage bucket for artist portfolios
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-portfolios', 'artist-portfolios', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload artist portfolios" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artist-portfolios' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view artist portfolios" ON storage.objects FOR SELECT USING (bucket_id = 'artist-portfolios');
CREATE POLICY "Admins can delete artist portfolios" ON storage.objects FOR DELETE USING (bucket_id = 'artist-portfolios' AND has_role(auth.uid(), 'admin'::app_role));

-- Ensure event_booking_global setting exists
INSERT INTO public.admin_site_settings (id, value) VALUES ('event_booking_global', '{"enabled": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;
