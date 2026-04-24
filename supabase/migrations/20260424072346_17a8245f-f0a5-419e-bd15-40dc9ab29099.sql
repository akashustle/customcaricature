
-- Post-event payment claims table
CREATE TABLE IF NOT EXISTS public.event_payment_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('cash','online')),
  amount NUMERIC NOT NULL DEFAULT 0,
  screenshot_path TEXT,
  user_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_reply TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_payment_claims_event ON public.event_payment_claims(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_claims_user ON public.event_payment_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_claims_status ON public.event_payment_claims(status);

ALTER TABLE public.event_payment_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own claims"
  ON public.event_payment_claims FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own claims"
  ON public.event_payment_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending claims"
  ON public.event_payment_claims FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage all claims"
  ON public.event_payment_claims FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_event_payment_claims_updated
  BEFORE UPDATE ON public.event_payment_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-complete past events
CREATE OR REPLACE FUNCTION public.auto_complete_past_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  WITH updated AS (
    UPDATE public.event_bookings
       SET status = 'completed',
           updated_at = now()
     WHERE status NOT IN ('completed','cancelled')
       AND (event_date + event_end_time::time) < now()
    RETURNING id
  )
  SELECT count(*) INTO affected FROM updated;
  RETURN COALESCE(affected, 0);
END;
$$;

-- Storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-claims','payment-claims', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own claim screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-claims' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own claim screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-claims' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins manage all claim screenshots"
  ON storage.objects FOR ALL
  USING (bucket_id = 'payment-claims' AND public.has_role(auth.uid(), 'admin'));
