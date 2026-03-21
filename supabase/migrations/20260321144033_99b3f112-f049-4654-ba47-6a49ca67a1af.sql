-- Fix: Allow admins to insert payment history records manually
DROP POLICY IF EXISTS "Only service role can insert payment history" ON public.payment_history;
CREATE POLICY "Admins can insert payment history"
  ON public.payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );