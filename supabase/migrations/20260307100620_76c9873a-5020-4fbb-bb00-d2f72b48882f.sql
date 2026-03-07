
-- Wishlist table
CREATE TABLE public.shop_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.shop_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wishlist" ON public.shop_wishlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Product reviews table
CREATE TABLE public.shop_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved reviews" ON public.shop_product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create own reviews" ON public.shop_product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.shop_product_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON public.shop_product_reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'shop_admin'::app_role));

-- Coupon codes table
CREATE TABLE public.shop_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 0,
  min_order_amount integer NOT NULL DEFAULT 0,
  max_discount_amount integer,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coupons" ON public.shop_coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.shop_coupons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'shop_admin'::app_role));

-- Add new columns to shop_products
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS dimensions text;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 0;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '[]'::jsonb;

-- Add new columns to shop_orders
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS estimated_delivery date;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS refund_status text;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS refund_amount integer DEFAULT 0;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS shipping_method text DEFAULT 'standard';
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

-- Enable realtime for wishlist
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_wishlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_product_reviews;
