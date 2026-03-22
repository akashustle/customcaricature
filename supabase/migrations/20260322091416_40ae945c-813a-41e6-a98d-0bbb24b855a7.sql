
-- Add login_count to admin_sessions to track total logins per user
ALTER TABLE public.admin_sessions ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 1;

-- Add admin_name_entry to store the mandatory name before entering panel
ALTER TABLE public.admin_sessions ADD COLUMN IF NOT EXISTS entered_name text;

-- Add steps_log JSONB to track actions during a session
ALTER TABLE public.admin_sessions ADD COLUMN IF NOT EXISTS steps_log jsonb DEFAULT '[]'::jsonb;

-- Create admin_login_tracking table for OTP gate after 5 logins post-logout
CREATE TABLE IF NOT EXISTS public.admin_login_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_logins integer DEFAULT 0,
  otp_required boolean DEFAULT false,
  otp_code text,
  otp_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_login_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own tracking" ON public.admin_login_tracking
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update own tracking" ON public.admin_login_tracking
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert tracking" ON public.admin_login_tracking
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
