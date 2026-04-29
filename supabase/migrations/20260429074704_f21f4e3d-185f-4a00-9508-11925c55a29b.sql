INSERT INTO public.admin_site_settings (id, value)
VALUES ('pwa_splash_enabled', '{"enabled": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;