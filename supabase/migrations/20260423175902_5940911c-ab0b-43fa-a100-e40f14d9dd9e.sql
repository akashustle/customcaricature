-- Enable real-time delete/update payloads for chat
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Default the website to light theme
INSERT INTO public.admin_site_settings (id, value, updated_at)
VALUES ('default_theme', '{"mode":"light"}'::jsonb, now())
ON CONFLICT (id) DO UPDATE SET value = '{"mode":"light"}'::jsonb, updated_at = now();