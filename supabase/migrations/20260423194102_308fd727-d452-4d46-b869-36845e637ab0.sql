-- 1. Add toggle on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS event_edit_allowed boolean NOT NULL DEFAULT false;

-- 2. Create reschedule requests table
CREATE TABLE IF NOT EXISTS public.event_reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_date date NOT NULL,
  requested_start_time text NOT NULL,
  requested_end_time text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_err_event ON public.event_reschedule_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_err_user ON public.event_reschedule_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_err_status ON public.event_reschedule_requests(status);

ALTER TABLE public.event_reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Users see their own
CREATE POLICY "Users view own reschedule requests"
  ON public.event_reschedule_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users insert their own (only if their profile has event_edit_allowed = true and they own the event)
CREATE POLICY "Users insert own reschedule requests"
  ON public.event_reschedule_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.event_edit_allowed = true
    )
    AND EXISTS (
      SELECT 1 FROM public.event_bookings eb
      WHERE eb.id = event_id AND eb.user_id = auth.uid()
    )
  );

-- Admins do anything
CREATE POLICY "Admins manage reschedule requests"
  ON public.event_reschedule_requests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_err_updated
  BEFORE UPDATE ON public.event_reschedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();