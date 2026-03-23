
-- Add device/location columns to push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS browser text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS os text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_sent boolean DEFAULT false;

-- Create scheduled push notifications table
CREATE TABLE IF NOT EXISTS public.scheduled_push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  image_url text,
  icon_url text DEFAULT '/logo.png',
  target_type text NOT NULL DEFAULT 'all',
  target_user_ids uuid[] DEFAULT '{}',
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scheduled_push_notifications ENABLE ROW LEVEL SECURITY;

-- Push analytics table for tracking delivery/clicks
CREATE TABLE IF NOT EXISTS public.push_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id text,
  batch_id text,
  event_type text NOT NULL,
  subscription_id text,
  user_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_analytics ENABLE ROW LEVEL SECURITY;

-- RLS: admin-only access
CREATE POLICY "Admin access scheduled_push" ON public.scheduled_push_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin access push_analytics" ON public.push_analytics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
