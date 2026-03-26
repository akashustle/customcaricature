ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS sheet_pushed boolean DEFAULT false;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS sheet_pushed_at timestamptz DEFAULT null;