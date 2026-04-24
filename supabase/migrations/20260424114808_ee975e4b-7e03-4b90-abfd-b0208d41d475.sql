-- 1. Fix the immediate "column country does not exist" error.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

-- 2. Edit-permission counters (admin can grant N edits per user).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS edits_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edit_lock_reason text;

ALTER TABLE public.workshop_users
  ADD COLUMN IF NOT EXISTS edits_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edit_lock_reason text;

-- 3. Edit-request tables — one for booking profiles, one for workshop students.
CREATE TABLE IF NOT EXISTS public.profile_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  edits_granted integer NOT NULL DEFAULT 0,
  admin_response text,
  reviewed_by text,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workshop_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  edits_granted integer NOT NULL DEFAULT 0,
  admin_response text,
  reviewed_by text,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_edit_requests_status ON public.profile_edit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_edit_requests_user ON public.profile_edit_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_edit_requests_status ON public.workshop_edit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_edit_requests_user ON public.workshop_edit_requests(workshop_user_id, created_at DESC);

ALTER TABLE public.profile_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_edit_requests ENABLE ROW LEVEL SECURITY;

-- Booking users: own rows only; admins: all rows.
CREATE POLICY "Users view own edit requests"
  ON public.profile_edit_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own edit requests"
  ON public.profile_edit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update edit requests"
  ON public.profile_edit_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete edit requests"
  ON public.profile_edit_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Workshop edit requests: workshop students authenticate via secret-code so we
-- allow public insert/select-on-own-id; admins can do anything.
CREATE POLICY "Anyone can view workshop edit requests"
  ON public.workshop_edit_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert workshop edit requests"
  ON public.workshop_edit_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins update workshop edit requests"
  ON public.workshop_edit_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_profile_edit_requests_updated_at ON public.profile_edit_requests;
CREATE TRIGGER trg_profile_edit_requests_updated_at
  BEFORE UPDATE ON public.profile_edit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_workshop_edit_requests_updated_at ON public.workshop_edit_requests;
CREATE TRIGGER trg_workshop_edit_requests_updated_at
  BEFORE UPDATE ON public.workshop_edit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();