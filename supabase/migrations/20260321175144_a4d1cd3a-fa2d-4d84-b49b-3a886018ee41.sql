
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-images', 'gallery-images', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Anyone can view gallery images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'gallery-images');
CREATE POLICY "Admins can upload gallery images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete gallery images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery-images' AND has_role(auth.uid(), 'admin'::app_role));
