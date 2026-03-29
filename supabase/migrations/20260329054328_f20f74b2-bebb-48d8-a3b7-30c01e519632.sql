CREATE POLICY "Allow anon to check artist existence by email or mobile"
ON public.artists
FOR SELECT
TO anon
USING (true);