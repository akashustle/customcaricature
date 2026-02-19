
-- 1. Artwork ready photos table
CREATE TABLE public.artwork_ready_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artwork_ready_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage artwork photos" ON public.artwork_ready_photos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Artists can insert artwork photos" ON public.artwork_ready_photos FOR INSERT WITH CHECK (has_role(auth.uid(), 'artist'::app_role));
CREATE POLICY "Artists can view artwork photos" ON public.artwork_ready_photos FOR SELECT USING (has_role(auth.uid(), 'artist'::app_role));
CREATE POLICY "Users can view own order artwork" ON public.artwork_ready_photos FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

-- 2. Add art confirmation status to orders
ALTER TABLE public.orders ADD COLUMN art_confirmation_status TEXT DEFAULT NULL;

-- 3. Admin media audit log
CREATE TABLE public.admin_media_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_order_id UUID,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_media_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit log" ON public.admin_media_audit_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for artwork photos
ALTER PUBLICATION supabase_realtime ADD TABLE public.artwork_ready_photos;
