
-- Add notification_batches table for broadcast analytics tracking
CREATE TABLE public.notification_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  sent_by uuid NOT NULL,
  sent_to_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification batches"
ON public.notification_batches FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add batch_id to notifications for analytics tracking
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.notification_batches(id);

-- Add clicked column to track if user actually clicked/opened the notification link
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS clicked boolean NOT NULL DEFAULT false;

-- Add blocked_ips table for admin IP blocking
CREATE TABLE public.admin_blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  blocked_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked IPs"
ON public.admin_blocked_ips FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notification_batches
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_batches;
