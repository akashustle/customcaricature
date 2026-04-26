-- Track who paid each demand and the payment reference
ALTER TABLE public.payment_demands
  ADD COLUMN IF NOT EXISTS paid_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS paid_by_payment_id text,
  ADD COLUMN IF NOT EXISTS paid_by_order_id text;

CREATE INDEX IF NOT EXISTS idx_payment_demands_event_id ON public.payment_demands(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_demands_paid_by_user ON public.payment_demands(paid_by_user_id);