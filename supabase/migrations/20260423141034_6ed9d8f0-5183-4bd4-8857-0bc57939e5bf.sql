-- Seed/flip defaults for visitor-facing splash + permissions per admin request
-- Splash control keys (homepage + workshop in addition to existing admin_splash_enabled)
INSERT INTO public.admin_site_settings (id, value)
VALUES
  ('homepage_splash_enabled', '{"enabled": false}'::jsonb),
  ('workshop_splash_enabled', '{"enabled": false}'::jsonb),
  ('admin_splash_enabled',    '{"enabled": false}'::jsonb),
  ('login_popup_visible',     '{"enabled": false}'::jsonb),
  ('app_onboarding_enabled',  '{"enabled": false}'::jsonb),
  ('custom_caricature_visible', '{"enabled": false}'::jsonb),
  ('permission_microphone',   '{"enabled": false}'::jsonb),
  ('permission_camera',       '{"enabled": false}'::jsonb),
  ('permission_location',     '{"enabled": false}'::jsonb),
  ('permission_notifications','{"enabled": false}'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = now();