
CREATE TABLE IF NOT EXISTS public.google_indexing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  action_type text NOT NULL DEFAULT 'URL_UPDATED',
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_indexing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view indexing logs"
  ON public.google_indexing_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert indexing logs"
  ON public.google_indexing_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_google_indexing_log_created ON public.google_indexing_log (created_at DESC);
CREATE INDEX idx_google_indexing_log_url ON public.google_indexing_log (url);
