
-- Add moderation fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS banned_by uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned) WHERE is_banned = true;

-- Enable realtime on profiles, orders, event_bookings, notifications for live admin/user dashboards
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.event_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_bookings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
