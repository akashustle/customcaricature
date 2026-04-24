
CREATE TABLE IF NOT EXISTS public.workshop_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_user_id uuid NOT NULL REFERENCES public.workshop_users(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  performed_by text,
  performed_by_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_verification_history_user
  ON public.workshop_verification_history(workshop_user_id, created_at DESC);

ALTER TABLE public.workshop_verification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage workshop verification history" ON public.workshop_verification_history;
CREATE POLICY "Admins manage workshop verification history"
  ON public.workshop_verification_history
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can do anything on verification history" ON public.workshop_verification_history;
CREATE POLICY "Service role can do anything on verification history"
  ON public.workshop_verification_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
