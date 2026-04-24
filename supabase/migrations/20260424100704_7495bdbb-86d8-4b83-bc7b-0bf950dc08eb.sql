-- Add a flag to profiles to mark booking accounts that were auto-created from a workshop signup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_from_workshop boolean NOT NULL DEFAULT false;

-- Backfill: any profile linked from workshop_users via auth_user_id is auto-created
UPDATE public.profiles p
SET    created_from_workshop = true
WHERE  EXISTS (
  SELECT 1 FROM public.workshop_users w
  WHERE  w.auth_user_id = p.user_id
)
AND    p.created_from_workshop = false;

-- Update handle_new_user trigger fn to also persist created_from_workshop
-- when the workshop sign-up flow stores it in raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_code text;
BEGIN
  generated_code := lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO public.profiles (
    user_id, full_name, mobile, email, instagram_id,
    address, city, state, district, pincode, secret_code, age, gender,
    created_from_workshop
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'instagram_id',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'district',
    NEW.raw_user_meta_data->>'pincode',
    generated_code,
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender',
    COALESCE((NEW.raw_user_meta_data->>'created_from_workshop')::boolean, false)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name   = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    mobile      = COALESCE(NULLIF(EXCLUDED.mobile, ''), public.profiles.mobile),
    instagram_id= COALESCE(EXCLUDED.instagram_id, public.profiles.instagram_id),
    address     = COALESCE(EXCLUDED.address, public.profiles.address),
    city        = COALESCE(EXCLUDED.city, public.profiles.city),
    state       = COALESCE(EXCLUDED.state, public.profiles.state),
    district    = COALESCE(EXCLUDED.district, public.profiles.district),
    pincode     = COALESCE(EXCLUDED.pincode, public.profiles.pincode),
    age         = COALESCE(EXCLUDED.age, public.profiles.age),
    gender      = COALESCE(EXCLUDED.gender, public.profiles.gender),
    created_from_workshop = public.profiles.created_from_workshop OR EXCLUDED.created_from_workshop;
  RETURN NEW;
END;
$function$;