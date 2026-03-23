
CREATE TABLE IF NOT EXISTS public.app_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'android',
  device_info text,
  ip_address text,
  app_version text DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all downloads"
  ON public.app_downloads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert downloads"
  ON public.app_downloads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- App usage tracking
CREATE TABLE IF NOT EXISTS public.app_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  screen text,
  metadata jsonb DEFAULT '{}',
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all actions"
  ON public.app_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert actions"
  ON public.app_actions FOR INSERT TO anon, authenticated
  WITH CHECK (true);
