
-- Lead Links table
CREATE TABLE public.lead_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  label text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_by_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by_user_id uuid,
  used_by_name text,
  used_by_email text,
  used_by_mobile text,
  booking_status text DEFAULT 'not_booked',
  booking_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lead Link caricature pricing overrides
CREATE TABLE public.lead_link_caricature_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_link_id uuid REFERENCES public.lead_links(id) ON DELETE CASCADE NOT NULL,
  caricature_type_slug text NOT NULL,
  custom_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lead Link event pricing overrides
CREATE TABLE public.lead_link_event_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_link_id uuid REFERENCES public.lead_links(id) ON DELETE CASCADE NOT NULL,
  region text NOT NULL DEFAULT 'mumbai',
  artist_count integer NOT NULL DEFAULT 1,
  custom_total_price numeric NOT NULL DEFAULT 0,
  custom_advance_amount numeric NOT NULL DEFAULT 0,
  custom_extra_hour_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lead Link user actions log
CREATE TABLE public.lead_link_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_link_id uuid REFERENCES public.lead_links(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  action_type text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_link_caricature_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_link_event_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_link_actions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage lead_links" ON public.lead_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lead_link_caricature_pricing" ON public.lead_link_caricature_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lead_link_event_pricing" ON public.lead_link_event_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lead_link_actions" ON public.lead_link_actions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read for lead_links (so the claim page can read link details)
CREATE POLICY "Anyone can read active lead links" ON public.lead_links
  FOR SELECT TO anon
  USING (is_active = true AND is_used = false);

-- Public read for pricing tied to active links
CREATE POLICY "Anyone can read active link caricature pricing" ON public.lead_link_caricature_pricing
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.lead_links WHERE id = lead_link_id AND is_active = true AND is_used = false));

CREATE POLICY "Anyone can read active link event pricing" ON public.lead_link_event_pricing
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.lead_links WHERE id = lead_link_id AND is_active = true AND is_used = false));

-- Allow authenticated users to insert actions (for tracking)
CREATE POLICY "Auth users can insert lead_link_actions" ON public.lead_link_actions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for lead_links
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_link_actions;
