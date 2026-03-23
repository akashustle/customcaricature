
-- User feature flags table for per-user feature gating
CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  is_enabled boolean DEFAULT false,
  enabled_by text DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags" ON public.user_feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own feature flags" ON public.user_feature_flags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add RLS policies for invoices if not exist  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Admins can manage invoices') THEN
    CREATE POLICY "Admins can manage invoices" ON public.invoices
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Users can read own invoices') THEN
    CREATE POLICY "Users can read own invoices" ON public.invoices
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
