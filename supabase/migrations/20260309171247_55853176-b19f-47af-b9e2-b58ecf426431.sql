
-- Workshop notifications table
CREATE TABLE IF NOT EXISTS public.workshop_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all workshop notifications"
  ON public.workshop_notifications FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view workshop notifications"
  ON public.workshop_notifications FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update own workshop notifications"
  ON public.workshop_notifications FOR UPDATE
  TO public
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_notifications;

-- Add admin_reply_to_reply column to workshop_feedback
ALTER TABLE public.workshop_feedback ADD COLUMN IF NOT EXISTS admin_reply_to_user_reply text;
ALTER TABLE public.workshop_feedback ADD COLUMN IF NOT EXISTS admin_reply_to_user_reply_at timestamp with time zone;
