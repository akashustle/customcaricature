
-- Create workshops table for multi-workshop management
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  dates TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  price TEXT DEFAULT '',
  highlights TEXT[] DEFAULT '{}',
  contact_whatsapp TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view workshops" ON public.workshops FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage workshops" ON public.workshops FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.workshops;
