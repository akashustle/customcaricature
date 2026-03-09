ALTER TABLE public.workshop_feedback ADD COLUMN IF NOT EXISTS user_reply text;
ALTER TABLE public.workshop_feedback ADD COLUMN IF NOT EXISTS user_reply_at timestamptz;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_assignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_certificates;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_videos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;