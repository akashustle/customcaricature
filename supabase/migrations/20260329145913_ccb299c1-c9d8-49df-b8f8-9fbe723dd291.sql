
-- Portal payment requests: artist requests user to pay via portal
CREATE TABLE public.portal_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  extra_hours NUMERIC NOT NULL DEFAULT 0,
  extra_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own portal payment requests"
  ON public.portal_payment_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Artists can create and view requests for their events
CREATE POLICY "Artists can manage portal payment requests"
  ON public.portal_payment_requests FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.artists WHERE auth_user_id = auth.uid() AND id = portal_payment_requests.artist_id)
  );

-- Admins can manage all
CREATE POLICY "Admins can manage all portal payment requests"
  ON public.portal_payment_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_payment_requests;
ALTER TABLE public.portal_payment_requests REPLICA IDENTITY FULL;
