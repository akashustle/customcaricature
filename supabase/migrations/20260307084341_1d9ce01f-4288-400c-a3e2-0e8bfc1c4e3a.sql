
-- Shop categories
CREATE TABLE public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shop products
CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL DEFAULT 0,
  discount_price integer,
  sku text,
  stock_quantity integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_pod boolean NOT NULL DEFAULT false,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shop product variations
CREATE TABLE public.shop_product_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  variation_type text NOT NULL DEFAULT 'size',
  variation_value text NOT NULL,
  price_adjustment integer NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Shop cart items
CREATE TABLE public.shop_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  variation_id uuid REFERENCES public.shop_product_variations(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  caricature_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shop orders
CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_number text NOT NULL UNIQUE DEFAULT '',
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  shipping_name text NOT NULL DEFAULT '',
  shipping_mobile text NOT NULL DEFAULT '',
  shipping_address text NOT NULL DEFAULT '',
  shipping_city text NOT NULL DEFAULT '',
  shipping_state text NOT NULL DEFAULT '',
  shipping_pincode text NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shop order items
CREATE TABLE public.shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id),
  variation_id uuid REFERENCES public.shop_product_variations(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  caricature_image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Shop settings
CREATE TABLE public.shop_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AI caricature jobs
CREATE TABLE public.ai_caricature_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_image_url text NOT NULL,
  caricature_image_url text,
  style text NOT NULL DEFAULT 'classic',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Default shop settings
INSERT INTO public.shop_settings (id, value) VALUES
  ('shop_enabled', '{"enabled": false}'::jsonb),
  ('shop_access_mode', '{"mode": "all"}'::jsonb);

-- Add shop access to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_access_allowed boolean NOT NULL DEFAULT true;

-- Indexes
CREATE INDEX idx_shop_products_category ON public.shop_products(category_id);
CREATE INDEX idx_shop_products_slug ON public.shop_products(slug);
CREATE INDEX idx_shop_products_active ON public.shop_products(is_active);
CREATE INDEX idx_shop_cart_user ON public.shop_cart_items(user_id);
CREATE INDEX idx_shop_orders_user ON public.shop_orders(user_id);
CREATE INDEX idx_shop_orders_status ON public.shop_orders(status);
CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);
CREATE INDEX idx_ai_caricature_user ON public.ai_caricature_jobs(user_id);

-- Enable RLS
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_caricature_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view categories" ON public.shop_categories FOR SELECT USING (true);
CREATE POLICY "Shop admins can manage categories" ON public.shop_categories FOR ALL USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view products" ON public.shop_products FOR SELECT USING (true);
CREATE POLICY "Shop admins can manage products" ON public.shop_products FOR ALL USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view variations" ON public.shop_product_variations FOR SELECT USING (true);
CREATE POLICY "Shop admins can manage variations" ON public.shop_product_variations FOR ALL USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own cart" ON public.shop_cart_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own shop orders" ON public.shop_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create shop orders" ON public.shop_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shop admins can manage all orders" ON public.shop_orders FOR ALL USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own order items" ON public.shop_order_items FOR SELECT USING (order_id IN (SELECT id FROM public.shop_orders WHERE user_id = auth.uid()));
CREATE POLICY "Users can create order items" ON public.shop_order_items FOR INSERT WITH CHECK (order_id IN (SELECT id FROM public.shop_orders WHERE user_id = auth.uid()));
CREATE POLICY "Shop admins can manage all order items" ON public.shop_order_items FOR ALL USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view shop settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Shop admins can manage shop settings" ON public.shop_settings FOR ALL USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own caricature jobs" ON public.ai_caricature_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shop admins can view caricature jobs" ON public.ai_caricature_jobs FOR SELECT USING (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_settings;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-images', 'shop-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('caricature-uploads', 'caricature-uploads', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view shop images" ON storage.objects FOR SELECT USING (bucket_id = 'shop-images');
CREATE POLICY "Shop admins can upload shop images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shop-images' AND (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Shop admins can delete shop images" ON storage.objects FOR DELETE USING (bucket_id = 'shop-images' AND (has_role(auth.uid(), 'shop_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users can upload caricatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'caricature-uploads' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view caricatures" ON storage.objects FOR SELECT USING (bucket_id = 'caricature-uploads');

-- Order number sequence and trigger
CREATE SEQUENCE IF NOT EXISTS shop_order_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_shop_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SHOP-' || EXTRACT(YEAR FROM NOW())::text || '-' || lpad(nextval('shop_order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_shop_order_number
  BEFORE INSERT ON public.shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_shop_order_number();

CREATE TRIGGER update_shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_categories_updated_at BEFORE UPDATE ON public.shop_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_orders_updated_at BEFORE UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
