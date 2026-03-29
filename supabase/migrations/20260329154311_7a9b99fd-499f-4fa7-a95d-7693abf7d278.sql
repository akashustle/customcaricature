
-- Artist payment/bank details table
CREATE TABLE public.artist_payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  upi_id text,
  upi_number text,
  bank_account_number text,
  bank_ifsc_code text,
  bank_account_name text,
  default_payment_method text DEFAULT 'upi_id',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(artist_id)
);

ALTER TABLE public.artist_payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own payment details"
ON public.artist_payment_details FOR SELECT TO authenticated
USING (
  artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Artists can insert own payment details"
ON public.artist_payment_details FOR INSERT TO authenticated
WITH CHECK (
  artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Artists can update own payment details"
ON public.artist_payment_details FOR UPDATE TO authenticated
USING (
  artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Admins can view all artist payment details"
ON public.artist_payment_details FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.artist_payout_requests ADD COLUMN IF NOT EXISTS preferred_payment_method text DEFAULT 'upi_id';
