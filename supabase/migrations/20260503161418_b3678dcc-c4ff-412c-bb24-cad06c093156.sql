CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.is_admin = true AND NEW.receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.receiver_id,
      '💬 New message from support',
      COALESCE(left(NEW.message, 120), 'You have a new message'),
      'chat',
      '/dashboard'
    );
  ELSIF NEW.is_admin = false THEN
    -- Notify all admins when a user replies in chat
    FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          r.user_id,
          '💬 New user chat message',
          COALESCE(left(NEW.message, 120), 'A user just messaged you'),
          'chat',
          '/admin-panel?tab=chat'
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;