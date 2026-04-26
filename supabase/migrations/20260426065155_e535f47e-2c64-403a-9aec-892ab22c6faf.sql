-- Allow users to read their own workshop_users record (direct link or matched by email/mobile from profile)
CREATE POLICY "Users can view their own workshop record"
ON public.workshop_users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (
        (p.email IS NOT NULL AND lower(p.email) = lower(workshop_users.email))
        OR (p.mobile IS NOT NULL AND workshop_users.mobile IS NOT NULL
            AND regexp_replace(p.mobile, '\D', '', 'g') = regexp_replace(workshop_users.mobile, '\D', '', 'g'))
      )
  )
);