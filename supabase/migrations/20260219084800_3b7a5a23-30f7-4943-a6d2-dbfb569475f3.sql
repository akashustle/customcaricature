
DROP POLICY "Anyone can insert payment history" ON public.payment_history;

CREATE POLICY "Only service role can insert payment history"
ON public.payment_history FOR INSERT
WITH CHECK (false);
