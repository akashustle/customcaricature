
-- Create payment_history table to track all payments
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  order_id uuid,
  booking_id uuid,
  payment_type text NOT NULL DEFAULT 'order', -- 'order', 'event_advance', 'event_remaining'
  razorpay_payment_id text,
  razorpay_order_id text,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'pending', 'failed'
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payment history"
ON public.payment_history FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payment history"
ON public.payment_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Service role inserts (from edge functions)
CREATE POLICY "Anyone can insert payment history"
ON public.payment_history FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;
