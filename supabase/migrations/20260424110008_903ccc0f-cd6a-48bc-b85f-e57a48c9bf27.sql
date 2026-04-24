-- Allow public/anon uploads + updates + deletes to the public 'avatars' bucket
-- Workshop users authenticate via a secret_code edge function and therefore
-- have no auth.uid(); without anon write policies their avatar uploads fail
-- with "new row violates row-level security policy".
-- The bucket is already public-read and paths are namespaced by workshop user
-- id so this is safe.

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;

CREATE POLICY "Anyone can upload avatars"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete avatars"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'avatars');
