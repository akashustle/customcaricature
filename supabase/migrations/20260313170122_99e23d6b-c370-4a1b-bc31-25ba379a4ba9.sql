-- Create countdown prompts table for workshop realtime countdown broadcasts
CREATE TABLE IF NOT EXISTS public.workshop_countdown_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL,
  slot TEXT NOT NULL DEFAULT 'all',
  details TEXT,
  seconds INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_countdown_prompts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workshop_countdown_prompts'
      AND policyname = 'Admins can manage workshop countdown prompts'
  ) THEN
    CREATE POLICY "Admins can manage workshop countdown prompts"
    ON public.workshop_countdown_prompts
    FOR ALL
    TO public
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workshop_countdown_prompts'
      AND policyname = 'Anyone can view workshop countdown prompts'
  ) THEN
    CREATE POLICY "Anyone can view workshop countdown prompts"
    ON public.workshop_countdown_prompts
    FOR SELECT
    TO public
    USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workshop_countdown_prompts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_countdown_prompts;
  END IF;
END
$$;