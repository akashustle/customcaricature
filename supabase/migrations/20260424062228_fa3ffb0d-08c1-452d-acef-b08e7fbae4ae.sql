-- Add avatar_url to workshop_users for editable profile picture
ALTER TABLE public.workshop_users 
  ADD COLUMN IF NOT EXISTS avatar_url text;