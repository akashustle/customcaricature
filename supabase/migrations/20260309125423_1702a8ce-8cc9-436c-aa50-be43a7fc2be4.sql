
-- Add missing columns to workshop_users
ALTER TABLE public.workshop_users 
  ADD COLUMN IF NOT EXISTS why_join text,
  ADD COLUMN IF NOT EXISTS payment_screenshot_path text,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;

-- Create workshop_live_sessions table
CREATE TABLE IF NOT EXISTS public.workshop_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL,
  slot text NOT NULL DEFAULT '6pm-9pm',
  title text NOT NULL,
  artist_name text,
  artist_portfolio_link text,
  requirements text,
  what_students_learn text,
  meet_link text,
  status text NOT NULL DEFAULT 'upcoming',
  link_enabled boolean NOT NULL DEFAULT false,
  link_expiry timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage live sessions" ON public.workshop_live_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view live sessions" ON public.workshop_live_sessions FOR SELECT USING (true);

-- Create workshop_attendance table
CREATE TABLE IF NOT EXISTS public.workshop_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_date date NOT NULL,
  status text NOT NULL DEFAULT 'absent',
  marked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_date)
);

ALTER TABLE public.workshop_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance" ON public.workshop_attendance FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view attendance" ON public.workshop_attendance FOR SELECT USING (true);

-- Add missing columns to workshop_feedback
ALTER TABLE public.workshop_feedback
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS google_review_clicked boolean NOT NULL DEFAULT false;

-- Add missing columns to workshop_assignments
ALTER TABLE public.workshop_assignments
  ADD COLUMN IF NOT EXISTS total_marks integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS pass_status text;

-- Add visible column to workshop_certificates
ALTER TABLE public.workshop_certificates
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT false;

-- Enable realtime for workshop tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_attendance;

-- Insert default workshop settings if not exist
INSERT INTO public.workshop_settings (id, value) VALUES 
  ('assignment_submission_enabled', '{"enabled": true}'::jsonb),
  ('assignment_submission_date', '{"date": "2026-03-16"}'::jsonb),
  ('certificate_visibility', '{"enabled": false}'::jsonb),
  ('live_session_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;
