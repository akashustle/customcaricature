
-- 1. Make order-photos bucket private (customer photos shouldn't be public)
UPDATE storage.buckets SET public = false WHERE id = 'order-photos';

-- 2. Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view order photos" ON storage.objects;

-- 3. Create admin-only view policy for order-photos
CREATE POLICY "Admins can view order photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'order-photos' AND 
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  );

-- 4. Restrict orders SELECT to admin-only (remove moderator access to PII)
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create reset_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.reset_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reset_attempts ENABLE ROW LEVEL SECURITY;

-- No public access to reset_attempts - only edge functions via service role
CREATE POLICY "No public access to reset_attempts" ON public.reset_attempts
  FOR ALL USING (false);

-- Index for efficient lookups
CREATE INDEX idx_reset_attempts_email_time ON public.reset_attempts (email, attempted_at);
