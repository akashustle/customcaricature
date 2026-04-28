-- Reconciliation log: every reconciliation attempt is recorded for auditing
CREATE TABLE IF NOT EXISTS public.payment_reconciliation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,                 -- 'cron' | 'manual' | 'client_poll'
  target_table text NOT NULL,           -- 'orders' | 'event_bookings' | 'shop_orders'
  target_id uuid NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  prev_status text,
  new_status text,
  outcome text NOT NULL,                -- 'updated' | 'no_change' | 'not_found' | 'error'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reconciliation log"
  ON public.payment_reconciliation_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_reconciliation_target
  ON public.payment_reconciliation_log (target_table, target_id);

CREATE INDEX IF NOT EXISTS idx_reconciliation_created_at
  ON public.payment_reconciliation_log (created_at DESC);

-- Helpful index for picking up stuck pending caricature orders
CREATE INDEX IF NOT EXISTS idx_orders_pending_with_rzp
  ON public.orders (created_at)
  WHERE payment_status = 'pending' AND razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_pending_with_rzp
  ON public.shop_orders (created_at)
  WHERE payment_status = 'pending' AND razorpay_order_id IS NOT NULL;