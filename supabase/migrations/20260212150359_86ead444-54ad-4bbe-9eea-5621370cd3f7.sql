
-- Add new columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS artist_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_delivery_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create profiles table for user accounts
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  email text NOT NULL,
  instagram_id text,
  address text,
  city text,
  state text,
  pincode text,
  secret_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS - users see own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Orders: users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Countries table for admin-managed country list
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Admins can insert countries" ON public.countries FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update countries" ON public.countries FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete countries" ON public.countries FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.countries (name) VALUES ('India');

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
