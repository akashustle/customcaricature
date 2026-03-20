
-- Workshop registration settings (registration_enabled, available slots)
INSERT INTO public.workshop_settings (id, value, updated_at) 
VALUES 
  ('registration_enabled', '{"enabled": false}'::jsonb, now()),
  ('registration_slots', '{"slots": ["12pm-3pm", "6pm-9pm"]}'::jsonb, now()),
  ('workshop_details', '{"title": "Caricature Masterclass Workshop", "description": "Learn the art of caricature from professional artists. This 2-day intensive workshop covers fundamentals, techniques, and advanced skills.", "dates": "14 & 15 March 2026", "duration": "3 hours per session", "highlights": ["Live demonstrations", "Hands-on practice", "Personal feedback", "Certificate of completion"], "price": "₹2,999", "contact_whatsapp": "8433843725"}'::jsonb, now()),
  ('assignments_deletable', '{"enabled": true}'::jsonb, now()),
  ('assignments_editable', '{"enabled": true}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
