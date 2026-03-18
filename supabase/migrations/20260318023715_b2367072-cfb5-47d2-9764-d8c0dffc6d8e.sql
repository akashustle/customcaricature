-- Payment demands table for event bookings
CREATE TABLE IF NOT EXISTS public.payment_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  note text,
  status_on_paid text DEFAULT 'confirmed',
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.payment_demands FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.admin_site_settings (id, value, updated_at)
VALUES ('shop_tracking_visible', '{"enabled": true}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_demands;