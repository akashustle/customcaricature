-- ====== APK download bucket + rate limit infra ======

-- 1) Public bucket so the APK URL works in browsers (Android needs https direct link)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-builds', 'app-builds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Read: public (anyone can download)
DROP POLICY IF EXISTS "app-builds public read" ON storage.objects;
CREATE POLICY "app-builds public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-builds');

-- Write/update/delete: admins only
DROP POLICY IF EXISTS "app-builds admin write" ON storage.objects;
CREATE POLICY "app-builds admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app-builds admin update" ON storage.objects;
CREATE POLICY "app-builds admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app-builds admin delete" ON storage.objects;
CREATE POLICY "app-builds admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

-- 2) Edge-function rate-limit table (token-bucket style)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id          text PRIMARY KEY,             -- "function:ip" or "function:user"
  window_start timestamptz NOT NULL DEFAULT now(),
  count       integer NOT NULL DEFAULT 0,
  blocked_until timestamptz
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- Only edge functions (service role) read/write; no public policies.
CREATE INDEX IF NOT EXISTS rate_limit_buckets_blocked_idx
  ON public.rate_limit_buckets (blocked_until)
  WHERE blocked_until IS NOT NULL;