
-- Add display_id column to profiles for 6-digit user IDs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

-- Create function to generate unique 6-digit IDs
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  done boolean := false;
BEGIN
  IF NEW.display_id IS NULL THEN
    WHILE NOT done LOOP
      new_id := lpad(floor(random() * 1000000)::text, 6, '0');
      done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE display_id = new_id);
    END LOOP;
    NEW.display_id := new_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate display_id on insert
CREATE TRIGGER set_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_display_id();

-- Generate display_ids for existing profiles that don't have one
DO $$
DECLARE
  r RECORD;
  new_id text;
  done boolean;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE display_id IS NULL LOOP
    done := false;
    WHILE NOT done LOOP
      new_id := lpad(floor(random() * 1000000)::text, 6, '0');
      done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE display_id = new_id);
    END LOOP;
    UPDATE public.profiles SET display_id = new_id WHERE id = r.id;
  END LOOP;
END;
$$;

-- Add file_url column to chat_messages for photo/doc sharing
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_name text;

-- Add typing_at column for typing indicators (we'll use presence instead, skip this)
