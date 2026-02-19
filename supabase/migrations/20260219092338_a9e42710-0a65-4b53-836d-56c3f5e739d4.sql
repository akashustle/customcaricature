-- Add secret_code_login_enabled column to profiles (default false)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secret_code_login_enabled boolean NOT NULL DEFAULT false;

-- Change gateway_charges_enabled default to false
ALTER TABLE public.profiles ALTER COLUMN gateway_charges_enabled SET DEFAULT false;

-- Update all existing users to have gateway_charges_enabled = false (as per user request: default off for all)
UPDATE public.profiles SET gateway_charges_enabled = false WHERE gateway_charges_enabled = true;