-- Drop the overly permissive policy we just added
DROP POLICY IF EXISTS "Allow anon to check artist existence by email or mobile" ON public.artists;

-- Create a security definer function for role detection that anon can call
CREATE OR REPLACE FUNCTION public.detect_login_role(p_identifier text, p_identifier_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{"is_admin": false, "is_artist": false}'::jsonb;
  v_user_id uuid;
BEGIN
  -- Check artist
  IF p_identifier_type = 'email' THEN
    IF EXISTS (SELECT 1 FROM artists WHERE email = p_identifier) THEN
      result := jsonb_set(result, '{is_artist}', 'true');
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM artists WHERE mobile = p_identifier) THEN
      result := jsonb_set(result, '{is_artist}', 'true');
    END IF;
  END IF;

  -- Check admin via profiles -> user_roles
  IF p_identifier_type = 'email' THEN
    SELECT user_id INTO v_user_id FROM profiles WHERE email = p_identifier LIMIT 1;
    IF v_user_id IS NULL THEN
      -- try phone.user format
      SELECT user_id INTO v_user_id FROM profiles WHERE email = (p_identifier || '@phone.user') LIMIT 1;
    END IF;
  ELSE
    SELECT user_id INTO v_user_id FROM profiles WHERE mobile = p_identifier LIMIT 1;
    IF v_user_id IS NULL THEN
      SELECT user_id INTO v_user_id FROM profiles WHERE email = (p_identifier || '@phone.user') LIMIT 1;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'admin') THEN
      result := jsonb_set(result, '{is_admin}', 'true');
    END IF;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute to anon so unauthenticated users can detect their role
GRANT EXECUTE ON FUNCTION public.detect_login_role(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.detect_login_role(text, text) TO authenticated;