-- Fix: Allow users to view their own order photos (including artwork) from storage
CREATE POLICY "Users can view own order photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-photos'
  AND (
    -- Check if the user owns the order associated with this photo path
    auth.uid() IN (
      SELECT o.user_id FROM public.orders o
      JOIN public.order_images oi ON oi.order_id = o.id
      WHERE oi.storage_path = name
    )
    OR
    auth.uid() IN (
      SELECT o.user_id FROM public.orders o
      JOIN public.artwork_ready_photos arp ON arp.order_id = o.id
      WHERE arp.storage_path = name
    )
  )
);

-- Also allow artists to view assigned order photos from storage
CREATE POLICY "Artists can view assigned order photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-photos'
  AND auth.uid() IN (
    SELECT a.auth_user_id FROM public.artists a
    JOIN public.orders o ON o.assigned_artist_id = a.id
    JOIN public.order_images oi ON oi.order_id = o.id
    WHERE oi.storage_path = name
    UNION
    SELECT a.auth_user_id FROM public.artists a
    JOIN public.orders o ON o.assigned_artist_id = a.id
    JOIN public.artwork_ready_photos arp ON arp.order_id = o.id
    WHERE arp.storage_path = name
  )
);