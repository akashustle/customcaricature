
-- Add recorded session preference columns to workshop_users
ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS prefers_recorded boolean NOT NULL DEFAULT false;
ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS prefers_recorded_note text;
ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS prefers_recorded_at timestamptz;

-- Create live session requests table
CREATE TABLE IF NOT EXISTS public.workshop_live_session_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_live_session_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage live session requests" ON public.workshop_live_session_requests
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view live session requests" ON public.workshop_live_session_requests
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert live session requests" ON public.workshop_live_session_requests
  FOR INSERT TO public WITH CHECK (true);

-- Enable realtime for new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_live_session_requests;
