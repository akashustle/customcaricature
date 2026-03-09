
-- Workshop admin action log table
CREATE TABLE IF NOT EXISTS public.workshop_admin_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workshop_admin_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workshop admin log" ON public.workshop_admin_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Workshop admin users table (to track multiple workshop admins)
CREATE TABLE IF NOT EXISTS public.workshop_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.workshop_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workshop admins" ON public.workshop_admins FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Workshop user location tracking
CREATE TABLE IF NOT EXISTS public.workshop_user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location_name text,
  location_allowed boolean NOT NULL DEFAULT false,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.workshop_user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workshop locations" ON public.workshop_user_locations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can upsert own location" ON public.workshop_user_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update locations" ON public.workshop_user_locations FOR UPDATE USING (true);
CREATE POLICY "Anyone can view locations" ON public.workshop_user_locations FOR SELECT USING (true);

-- Add gender column to workshop_users if not exists
ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS gender text;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_admin_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_user_locations;
