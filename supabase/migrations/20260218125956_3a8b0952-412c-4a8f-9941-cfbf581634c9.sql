-- Fix: Remove redundant "Users can view own reviews" policy since reviews are public (like product reviews)
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;