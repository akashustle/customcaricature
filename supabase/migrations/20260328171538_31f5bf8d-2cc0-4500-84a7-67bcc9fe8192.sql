
-- Artist Payout Settings (per-artist default config)
CREATE TABLE public.artist_payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  payout_type TEXT NOT NULL DEFAULT 'percentage' CHECK (payout_type IN ('percentage', 'fixed')),
  payout_value NUMERIC NOT NULL DEFAULT 0,
  payout_cycle TEXT NOT NULL DEFAULT 'per_event' CHECK (payout_cycle IN ('per_event', 'weekly', 'monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id)
);

-- Artist Event Payouts (per-event payout records)
CREATE TABLE public.artist_event_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  payout_type TEXT NOT NULL DEFAULT 'percentage' CHECK (payout_type IN ('percentage', 'fixed')),
  payout_value NUMERIC NOT NULL DEFAULT 0,
  event_total NUMERIC NOT NULL DEFAULT 0,
  calculated_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'cancelled')),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, event_id)
);

-- Artist Payout Requests
CREATE TABLE public.artist_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'full' CHECK (request_type IN ('full', 'partial')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'credited', 'rejected')),
  admin_note TEXT,
  expected_credit_date DATE,
  credited_at TIMESTAMPTZ,
  screenshot_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Artist Transactions (credits/debits with screenshots)
CREATE TABLE public.artist_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'credit', 'debit', 'adjustment')),
  amount NUMERIC NOT NULL,
  description TEXT,
  event_id UUID REFERENCES public.event_bookings(id),
  payout_request_id UUID REFERENCES public.artist_payout_requests(id),
  screenshot_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-assign eligible artists
CREATE TABLE public.auto_assign_eligible_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id)
);

-- Enable RLS
ALTER TABLE public.artist_payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_event_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_assign_eligible_artists ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin full access
CREATE POLICY "Admins full access payout_settings" ON public.artist_payout_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access event_payouts" ON public.artist_event_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access payout_requests" ON public.artist_payout_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access transactions" ON public.artist_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access auto_assign" ON public.auto_assign_eligible_artists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Artists can read their own payout settings
CREATE POLICY "Artists read own payout_settings" ON public.artist_payout_settings FOR SELECT TO authenticated
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

-- Artists can read their own event payouts
CREATE POLICY "Artists read own event_payouts" ON public.artist_event_payouts FOR SELECT TO authenticated
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

-- Artists can read and insert their own payout requests
CREATE POLICY "Artists read own payout_requests" ON public.artist_payout_requests FOR SELECT TO authenticated
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Artists insert own payout_requests" ON public.artist_payout_requests FOR INSERT TO authenticated
WITH CHECK (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

-- Artists can read their own transactions
CREATE POLICY "Artists read own transactions" ON public.artist_transactions FOR SELECT TO authenticated
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_event_payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_payout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_transactions;
