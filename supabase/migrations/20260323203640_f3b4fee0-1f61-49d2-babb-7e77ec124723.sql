
-- Referral codes table
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  reward_type TEXT NOT NULL DEFAULT 'discount_percent',
  reward_value NUMERIC NOT NULL DEFAULT 10,
  max_uses INTEGER DEFAULT NULL,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral uses tracking
CREATE TABLE public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_given BOOLEAN NOT NULL DEFAULT false,
  reward_amount NUMERIC DEFAULT 0,
  order_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 10,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ DEFAULT NULL,
  allowed_user_ids UUID[] DEFAULT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coupon uses tracking
CREATE TABLE public.coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID DEFAULT NULL,
  discount_applied NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance settings (per page)
CREATE TABLE public.maintenance_settings (
  id TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  title TEXT DEFAULT 'Under Maintenance',
  message TEXT DEFAULT 'We are performing scheduled maintenance. Please check back soon.',
  estimated_end TIMESTAMPTZ DEFAULT NULL,
  allowed_user_ids UUID[] DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID DEFAULT NULL
);

-- Insert default maintenance rows for key pages
INSERT INTO public.maintenance_settings (id, is_enabled, title, message) VALUES
  ('global', false, 'Site Under Maintenance', 'We are performing scheduled maintenance. Please check back soon.'),
  ('home', false, 'Homepage Maintenance', 'Homepage is temporarily unavailable.'),
  ('registration', false, 'Registration Closed', 'New registrations are temporarily closed.'),
  ('login', false, 'Login Unavailable', 'Login is temporarily unavailable.'),
  ('dashboard', false, 'Dashboard Maintenance', 'Your dashboard is under maintenance.'),
  ('order', false, 'Orders Paused', 'New orders are temporarily paused.'),
  ('book-event', false, 'Event Booking Paused', 'Event bookings are temporarily paused.'),
  ('shop', false, 'Shop Maintenance', 'Our shop is temporarily unavailable.'),
  ('enquiry', false, 'Enquiry Paused', 'Enquiries are temporarily paused.');

-- RLS policies
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Referral codes: users see own, admins see all
CREATE POLICY "Users can view own referral codes" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage referral codes" ON public.referral_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own referral codes" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Referral uses: involved users and admins
CREATE POLICY "Users can view own referral uses" ON public.referral_uses FOR SELECT TO authenticated USING (referred_user_id = auth.uid() OR referrer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage referral uses" ON public.referral_uses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert referral uses" ON public.referral_uses FOR INSERT TO authenticated WITH CHECK (true);

-- Coupons: public view active, admins manage
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Coupon uses: own uses and admins
CREATE POLICY "Users can view own coupon uses" ON public.coupon_uses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage coupon uses" ON public.coupon_uses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert coupon uses" ON public.coupon_uses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Maintenance: public read, admin write
CREATE POLICY "Anyone can read maintenance" ON public.maintenance_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage maintenance" ON public.maintenance_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
