-- Add district column to profiles so registration data is fully captured
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;

-- Update handle_new_user trigger to capture district from registration metadata
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
    address, city, state, district, pincode, secret_code, age, gender
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
    NEW.raw_user_meta_data->>'gender'
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
    gender      = COALESCE(EXCLUDED.gender, public.profiles.gender);
  RETURN NEW;
END;
$function$;