-- 1. Add is_verified column for blue-tick verified users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 2. Auto-verify users who already have at least one event booking
UPDATE public.profiles p
SET is_verified = true
WHERE EXISTS (
  SELECT 1 FROM public.event_bookings eb WHERE eb.user_id = p.user_id
)
AND p.is_verified = false;

-- 3. Allow event booking for ALL existing users (and going forward via default)
ALTER TABLE public.profiles ALTER COLUMN event_booking_allowed SET DEFAULT true;
UPDATE public.profiles SET event_booking_allowed = true WHERE event_booking_allowed IS DISTINCT FROM true;

-- 4. Trigger: auto-verify whenever a new event_booking row is inserted for a user
CREATE OR REPLACE FUNCTION public.auto_verify_on_event_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET is_verified = true
     WHERE user_id = NEW.user_id
       AND is_verified = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verify_on_event_booking ON public.event_bookings;
CREATE TRIGGER trg_auto_verify_on_event_booking
AFTER INSERT ON public.event_bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_verify_on_event_booking();

-- 5. Make sure global gateway charge percentage is set to 2.6%
INSERT INTO public.admin_site_settings (id, value)
VALUES ('gateway_charge_percentage', jsonb_build_object('percentage', 2.6))
ON CONFLICT (id) DO UPDATE SET value = jsonb_build_object('percentage', 2.6), updated_at = now();