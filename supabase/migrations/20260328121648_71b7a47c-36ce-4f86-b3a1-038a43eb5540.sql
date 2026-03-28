
CREATE TABLE public.lil_flea_notify_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  instagram_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lil_flea_notify_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert notify signup"
  ON public.lil_flea_notify_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view notify users"
  ON public.lil_flea_notify_users
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notify users"
  ON public.lil_flea_notify_users
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
