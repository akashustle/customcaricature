
-- Support messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert support messages" ON public.support_messages
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can manage all support messages" ON public.support_messages
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Add email field and event_type and link_clicked tracking to enquiries
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS link_clicked BOOLEAN DEFAULT false;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS link_clicked_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
