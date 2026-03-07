-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL DEFAULT '',
  user_id uuid,
  order_id uuid,
  booking_id uuid,
  shop_order_id uuid,
  invoice_type text NOT NULL DEFAULT 'custom_order',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_mobile text NOT NULL,
  amount integer NOT NULL,
  tax_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method text DEFAULT 'razorpay',
  payment_id text,
  status text NOT NULL DEFAULT 'generated',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Create trigger for invoice number generation
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW())::text || '-' || lpad(nextval('invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Shop admins can manage shop invoices" ON public.invoices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'shop_admin'::app_role) AND invoice_type = 'shop_order');

CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Insert shop_nav_visible setting
INSERT INTO public.admin_site_settings (id, value) VALUES ('shop_nav_visible', '{"enabled": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;