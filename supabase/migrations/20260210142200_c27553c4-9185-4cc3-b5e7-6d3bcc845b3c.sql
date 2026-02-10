
-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('new', 'in_progress', 'artwork_ready', 'dispatched', 'delivered', 'completed');

-- Create enum for caricature type
CREATE TYPE public.caricature_type AS ENUM ('digital', 'physical');

-- Create enum for order type
CREATE TYPE public.order_type AS ENUM ('single', 'couple', 'group');

-- Create enum for style
CREATE TYPE public.caricature_style AS ENUM ('cute', 'romantic', 'fun', 'royal', 'minimal', 'artists_choice');

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caricature_type caricature_type NOT NULL,
  order_type order_type NOT NULL,
  style caricature_style NOT NULL DEFAULT 'artists_choice',
  notes TEXT,
  
  -- Customer details
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  
  -- Pricing
  face_count INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL,
  
  -- Location (physical only)
  country TEXT,
  state TEXT,
  city TEXT,
  district TEXT,
  is_framed BOOLEAN DEFAULT false,
  
  -- Delivery address (physical only)
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_pincode TEXT,
  
  -- Payment
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_verified BOOLEAN DEFAULT false,
  
  -- Status
  status order_status NOT NULL DEFAULT 'new',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order images table
CREATE TABLE public.order_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Orders: public insert (customers place orders), admin select/update
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Order images: public insert, admin select
CREATE POLICY "Anyone can insert order images" ON public.order_images
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view order images" ON public.order_images
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- User roles: admin only
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for order photos
INSERT INTO storage.buckets (id, name, public) VALUES ('order-photos', 'order-photos', true);

-- Storage policies
CREATE POLICY "Anyone can upload order photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'order-photos');

CREATE POLICY "Anyone can view order photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'order-photos');

CREATE POLICY "Admins can delete order photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'order-photos' AND (public.has_role(auth.uid(), 'admin')));
