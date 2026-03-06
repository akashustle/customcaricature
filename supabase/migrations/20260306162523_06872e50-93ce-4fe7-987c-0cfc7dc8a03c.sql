
-- Workshop Users (admin-added only)
CREATE TABLE public.workshop_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  email text NOT NULL,
  instagram_id text,
  age integer,
  occupation text,
  workshop_date date NOT NULL,
  slot text NOT NULL,
  student_type text NOT NULL DEFAULT 'manually_added',
  video_access_enabled boolean NOT NULL DEFAULT true,
  video_download_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workshop Videos
CREATE TABLE public.workshop_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  video_url text,
  video_type text NOT NULL DEFAULT 'link',
  workshop_date date NOT NULL,
  slot text,
  expiry_date timestamptz,
  target_type text NOT NULL DEFAULT 'all',
  global_download_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Per-user video access overrides
CREATE TABLE public.workshop_user_video_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.workshop_users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.workshop_videos(id) ON DELETE CASCADE,
  custom_expiry timestamptz,
  download_allowed boolean NOT NULL DEFAULT false,
  access_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Workshop Certificates
CREATE TABLE public.workshop_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.workshop_users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Workshop Assignments
CREATE TABLE public.workshop_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.workshop_users(id) ON DELETE CASCADE,
  file_name text,
  storage_path text,
  marks integer,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz,
  graded_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Workshop Feedback
CREATE TABLE public.workshop_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.workshop_users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Workshop Settings (global toggles)
CREATE TABLE public.workshop_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.workshop_settings (id, value) VALUES
  ('global_video_access', '{"enabled": true}'::jsonb),
  ('global_video_download', '{"enabled": false}'::jsonb);

-- RLS Policies
ALTER TABLE public.workshop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_user_video_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;

-- Workshop Users: admin full access, anon select for login
CREATE POLICY "Admins can manage workshop users" ON public.workshop_users FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view workshop users for login" ON public.workshop_users FOR SELECT USING (true);

-- Workshop Videos: admin full, anon select
CREATE POLICY "Admins can manage workshop videos" ON public.workshop_videos FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view workshop videos" ON public.workshop_videos FOR SELECT USING (true);

-- Video Access: admin full, anon select
CREATE POLICY "Admins can manage video access" ON public.workshop_user_video_access FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view video access" ON public.workshop_user_video_access FOR SELECT USING (true);

-- Certificates: admin full, anon select
CREATE POLICY "Admins can manage certificates" ON public.workshop_certificates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view certificates" ON public.workshop_certificates FOR SELECT USING (true);

-- Assignments: admin full, anon select+insert+update
CREATE POLICY "Admins can manage assignments" ON public.workshop_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view assignments" ON public.workshop_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert assignments" ON public.workshop_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update assignments" ON public.workshop_assignments FOR UPDATE USING (true);

-- Feedback: admin full, anon select+insert
CREATE POLICY "Admins can manage feedback" ON public.workshop_feedback FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view feedback" ON public.workshop_feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can insert feedback" ON public.workshop_feedback FOR INSERT WITH CHECK (true);

-- Settings: admin full, anon select
CREATE POLICY "Admins can manage workshop settings" ON public.workshop_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view workshop settings" ON public.workshop_settings FOR SELECT USING (true);

-- Storage bucket for workshop files
INSERT INTO storage.buckets (id, name, public) VALUES ('workshop-files', 'workshop-files', false);

-- Storage policies for workshop-files bucket
CREATE POLICY "Admins can manage workshop files" ON storage.objects FOR ALL USING (bucket_id = 'workshop-files' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can upload workshop files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workshop-files');
CREATE POLICY "Anyone can view workshop files" ON storage.objects FOR SELECT USING (bucket_id = 'workshop-files');

-- Enable realtime for workshop tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_assignments;
