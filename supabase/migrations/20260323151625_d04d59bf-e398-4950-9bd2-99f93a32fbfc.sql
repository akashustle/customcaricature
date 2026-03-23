
CREATE TABLE public.order_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_date DATE,
  new_date DATE NOT NULL,
  reason TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  admin_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.order_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to order_extensions" ON public.order_extensions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own order extensions" ON public.order_extensions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_extensions.order_id AND orders.user_id = auth.uid()
    )
  );
