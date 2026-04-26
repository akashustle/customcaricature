-- Create ban appeals table
CREATE TABLE IF NOT EXISTS public.ban_appeals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  full_name text,
  email text,
  reason text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_response text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- Users can create their own appeals
CREATE POLICY "Users insert own ban appeals"
ON public.ban_appeals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own appeals
CREATE POLICY "Users view own ban appeals"
ON public.ban_appeals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can update appeals
CREATE POLICY "Admins update ban appeals"
ON public.ban_appeals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins delete ban appeals"
ON public.ban_appeals
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER ban_appeals_updated_at
BEFORE UPDATE ON public.ban_appeals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ban_appeals;

-- Notify admins on new appeal
CREATE OR REPLACE FUNCTION public.notify_admin_new_ban_appeal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '⚖️ New Ban Appeal',
        'Appeal from ' || COALESCE(NEW.full_name, 'a banned user'),
        'broadcast',
        '/admin-panel'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Ban appeal notify failed: %', SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admin_new_ban_appeal
AFTER INSERT ON public.ban_appeals
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_ban_appeal();
