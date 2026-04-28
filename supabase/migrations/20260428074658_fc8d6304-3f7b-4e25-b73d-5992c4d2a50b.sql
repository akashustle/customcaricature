-- Referral click + conversion tracking
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code text NOT NULL,
  referrer_user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('click','register','login','booking','order')),
  visitor_session_id text,
  referred_user_id uuid,
  user_agent text,
  ip_address text,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_code ON public.referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_created ON public.referral_events(created_at DESC);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

-- Anyone can log a click (anon)
CREATE POLICY "Anyone can insert referral events"
  ON public.referral_events FOR INSERT
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all referral events"
  ON public.referral_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view events where they are the referrer
CREATE POLICY "Users can view their own referral events"
  ON public.referral_events FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Admins can delete
CREATE POLICY "Admins can delete referral events"
  ON public.referral_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));