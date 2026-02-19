-- Allow admins to delete user location data
CREATE POLICY "Admins can delete locations"
ON public.user_live_locations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete order images
CREATE POLICY "Admins can delete order images"
ON public.order_images
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));