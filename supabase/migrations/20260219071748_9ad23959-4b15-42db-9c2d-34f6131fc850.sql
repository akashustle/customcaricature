-- Fix remaining_amount: convert from generated to regular column
ALTER TABLE public.event_bookings DROP COLUMN remaining_amount;
ALTER TABLE public.event_bookings ADD COLUMN remaining_amount integer;

-- Create chat messages table for user-admin live chat
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages" ON public.chat_messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send messages" ON public.chat_messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages" ON public.chat_messages
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update messages (mark read)
CREATE POLICY "Users can update own received messages" ON public.chat_messages
FOR UPDATE USING (auth.uid() = receiver_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add artist assignment to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_artist_id uuid REFERENCES public.artists(id);

-- Artists can view assigned orders
CREATE POLICY "Artists can view assigned orders" ON public.orders
FOR SELECT USING (assigned_artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

-- Artists can update order status only
CREATE POLICY "Artists can update assigned order status" ON public.orders
FOR UPDATE USING (assigned_artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));