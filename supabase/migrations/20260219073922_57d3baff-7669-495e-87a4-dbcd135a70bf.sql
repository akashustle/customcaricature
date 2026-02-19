
-- Add gateway charges toggle to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gateway_charges_enabled boolean NOT NULL DEFAULT true;

-- Add is_artist_chat column to chat_messages for separating artist vs user chats
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_artist_chat boolean NOT NULL DEFAULT false;
