-- Allow users to update their own portal payment requests (status changes)
CREATE POLICY "Users can update own portal payment requests"
ON public.portal_payment_requests
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());