-- Enable realtime on critical tables for live functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'maintenance_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_settings;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ai_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ai_chat_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_sessions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_actions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_site_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'event_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'enquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries;
  END IF;
END $$;