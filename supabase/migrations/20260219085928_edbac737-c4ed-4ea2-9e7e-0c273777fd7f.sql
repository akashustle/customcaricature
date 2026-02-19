
-- Update handle_new_user trigger to generate secret code server-side
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_code text;
BEGIN
  -- Generate a random 4-digit secret code server-side
  generated_code := lpad(floor(random() * 10000)::text, 4, '0');
  
  INSERT INTO public.profiles (
    user_id,
    full_name,
    mobile,
    email,
    instagram_id,
    address,
    city,
    state,
    pincode,
    secret_code
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'instagram_id',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'pincode',
    generated_code  -- Server-generated, ignoring any client-supplied value
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
