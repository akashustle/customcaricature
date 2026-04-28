CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  process_notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rzp_webhook_received ON public.razorpay_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_rzp_webhook_type ON public.razorpay_webhook_events(event_type);

ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook events"
ON public.razorpay_webhook_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));