
ALTER TABLE public.workshop_users 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'India',
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS skill_level text,
ADD COLUMN IF NOT EXISTS artist_background_type text,
ADD COLUMN IF NOT EXISTS razorpay_order_id text,
ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS artist_background text;

ALTER TABLE public.workshop_users ALTER COLUMN artist_background TYPE text USING artist_background::text;
