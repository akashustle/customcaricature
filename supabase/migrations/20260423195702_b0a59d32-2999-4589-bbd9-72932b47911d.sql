-- Event drafts: save unfinished events users can come back to
CREATE TABLE public.event_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT,
  event_date DATE,
  start_time TEXT,
  end_time TEXT,
  hours INTEGER DEFAULT 2,
  state TEXT,
  district TEXT,
  city TEXT,
  venue_name TEXT,
  full_address TEXT,
  pincode TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own drafts"
  ON public.event_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own drafts"
  ON public.event_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own drafts"
  ON public.event_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own drafts"
  ON public.event_drafts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all drafts"
  ON public.event_drafts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_event_drafts_updated_at
  BEFORE UPDATE ON public.event_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_event_drafts_user_id ON public.event_drafts(user_id);