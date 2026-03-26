ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS secret_code text DEFAULT lpad(floor(random() * 10000)::text, 4, '0');

-- Update existing artists that have null secret_code
UPDATE public.artists SET secret_code = lpad(floor(random() * 10000)::text, 4, '0') WHERE secret_code IS NULL;

-- Trigger to auto-generate secret code for new artists
CREATE OR REPLACE FUNCTION public.generate_artist_secret_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.secret_code IS NULL THEN
    NEW.secret_code := lpad(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_artist_secret_code
  BEFORE INSERT ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION generate_artist_secret_code();

-- Trigger to notify artists when assigned to events
CREATE OR REPLACE FUNCTION public.notify_artist_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  artist_auth_id uuid;
  event_rec RECORD;
BEGIN
  -- Get artist's auth user id
  SELECT auth_user_id INTO artist_auth_id FROM public.artists WHERE id = NEW.artist_id;
  
  IF artist_auth_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get event details
  SELECT client_name, event_date, city, event_type INTO event_rec
  FROM public.event_bookings WHERE id = NEW.event_id;
  
  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      artist_auth_id,
      '🎨 New Event Assigned',
      'You have been assigned to ' || COALESCE(event_rec.client_name, 'a client') || '''s ' || COALESCE(event_rec.event_type, 'event') || ' on ' || COALESCE(event_rec.event_date, 'TBD') || ' in ' || COALESCE(event_rec.city, 'TBD'),
      'event',
      '/artist-dashboard'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Artist notification failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_artist_assigned
  AFTER INSERT ON public.event_artist_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_artist_on_assignment();