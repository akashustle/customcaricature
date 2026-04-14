
-- Fix 1: Restrict event-documents read access to event owners, assigned artists, and admins
DROP POLICY IF EXISTS "Users can view event documents" ON storage.objects;

CREATE POLICY "Event document owners and admins can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.event_bookings eb
      WHERE eb.user_id = auth.uid()
        AND storage.foldername(name) @> ARRAY[eb.id::text]
    )
    OR EXISTS (
      SELECT 1 FROM public.event_artist_assignments eaa
      JOIN public.artists a ON a.id = eaa.artist_id
      WHERE a.auth_user_id = auth.uid()
        AND storage.foldername(name) @> ARRAY[eaa.event_id::text]
    )
  )
);

-- Fix 2: Restrict order-photos uploads to paths scoped to the user's own orders
DROP POLICY IF EXISTS "Authenticated users can upload order photos" ON storage.objects;

CREATE POLICY "Users can upload to own order photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-photos'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.user_id = auth.uid()
        AND storage.foldername(name) @> ARRAY[o.id::text]
    )
  )
);
