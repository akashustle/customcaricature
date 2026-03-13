
-- Allow anyone to insert attendance (workshop users aren't supabase-authed)
CREATE POLICY "Anyone can insert attendance" ON public.workshop_attendance FOR INSERT TO public WITH CHECK (true);

-- Allow anyone to update attendance
CREATE POLICY "Anyone can update attendance" ON public.workshop_attendance FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Enable realtime for these tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workshop_online_attendance_prompts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_online_attendance_prompts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workshop_countdown_prompts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_countdown_prompts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workshop_attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_attendance;
  END IF;
END $$;
