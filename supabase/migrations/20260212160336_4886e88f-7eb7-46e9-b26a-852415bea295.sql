
-- Create caricature_types table for dynamic pricing management from admin
CREATE TABLE public.caricature_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  price integer NOT NULL DEFAULT 0,
  per_face boolean NOT NULL DEFAULT false,
  min_faces integer NOT NULL DEFAULT 1,
  max_faces integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.caricature_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active caricature types" ON public.caricature_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert caricature types" ON public.caricature_types FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update caricature types" ON public.caricature_types FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete caricature types" ON public.caricature_types FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default pricing
INSERT INTO public.caricature_types (name, slug, price, per_face, min_faces, max_faces, sort_order) VALUES
  ('Single', 'single', 3499, false, 1, 1, 1),
  ('Couple', 'couple', 9499, false, 2, 2, 2),
  ('Group', 'group', 3499, true, 3, 6, 3);

-- Add negotiated_amount to orders for custom pricing per customer
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS negotiated_amount integer;

-- Add trigger for caricature_types updated_at
CREATE TRIGGER update_caricature_types_updated_at
  BEFORE UPDATE ON public.caricature_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
