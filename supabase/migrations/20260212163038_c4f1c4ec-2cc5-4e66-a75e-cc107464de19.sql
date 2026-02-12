
-- Enable realtime for orders so user dashboard gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
