DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'event_bookings','profiles','enquiries','notifications','chat_messages',
    'caricature_gallery','event_gallery','caricature_types','event_pricing',
    'blog_posts','admin_site_settings','invoices','homepage_reviews','artists',
    'automation_templates','funnel_events'
  ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;