-- Add workshop_id to workshop_users to link users to specific workshops
ALTER TABLE public.workshop_users ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL;

-- Add workshop_id to workshop_videos
ALTER TABLE public.workshop_videos ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL;

-- Add workshop_id to workshop_live_sessions
ALTER TABLE public.workshop_live_sessions ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL;

-- Set existing data to current active workshop
UPDATE public.workshop_users SET workshop_id = (SELECT id FROM public.workshops WHERE is_active = true LIMIT 1) WHERE workshop_id IS NULL;
UPDATE public.workshop_videos SET workshop_id = (SELECT id FROM public.workshops WHERE is_active = true LIMIT 1) WHERE workshop_id IS NULL;
UPDATE public.workshop_live_sessions SET workshop_id = (SELECT id FROM public.workshops WHERE is_active = true LIMIT 1) WHERE workshop_id IS NULL;