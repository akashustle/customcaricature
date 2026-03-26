-- Artist action logs table
CREATE TABLE IF NOT EXISTS public.artist_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL DEFAULT '',
  action_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read artist logs" ON public.artist_action_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can read own logs" ON public.artist_action_logs
  FOR SELECT TO authenticated
  USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Authenticated can insert artist logs" ON public.artist_action_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_action_logs;

-- Guest enquiry tracking table for dedup
CREATE TABLE IF NOT EXISTS public.guest_enquiry_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  mobile text,
  enquiry_count integer NOT NULL DEFAULT 1,
  last_enquiry_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_enquiry_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert guest tracking" ON public.guest_enquiry_tracking
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read guest tracking" ON public.guest_enquiry_tracking
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update guest tracking" ON public.guest_enquiry_tracking
  FOR UPDATE USING (true);