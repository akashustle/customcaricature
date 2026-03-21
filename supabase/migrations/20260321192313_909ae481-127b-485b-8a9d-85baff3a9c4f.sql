CREATE TABLE IF NOT EXISTS public.calculator_pricing_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  details text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calculator_pricing_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pricing sets" ON public.calculator_pricing_sets
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage pricing sets" ON public.calculator_pricing_sets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete calculator sessions" ON public.calculator_sessions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.calculator_pricing_sets;