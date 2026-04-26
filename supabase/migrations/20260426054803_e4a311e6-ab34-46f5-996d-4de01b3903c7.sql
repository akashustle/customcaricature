-- Track which step of registration the workshop user reached so we can
-- resume them on re-login if they bailed before paying.
ALTER TABLE public.workshop_users
  ADD COLUMN IF NOT EXISTS registration_step integer NOT NULL DEFAULT 0;

-- Backfill: anyone who's already marked paid is past the last step.
UPDATE public.workshop_users
   SET registration_step = 99
 WHERE payment_status IN ('paid', 'completed', 'fully_paid');

-- Make sure verified badge state for Sharad Sharma is on (idempotent).
UPDATE public.profiles
   SET is_verified = true
 WHERE lower(email) = 'sharad.sharma.in@gmail.com'
   AND is_verified IS DISTINCT FROM true;