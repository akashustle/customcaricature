
-- Add column for admin to toggle "ask user to mark delivered"
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ask_user_delivered boolean DEFAULT false;
