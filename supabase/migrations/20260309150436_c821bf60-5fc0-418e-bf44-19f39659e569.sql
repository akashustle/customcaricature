
-- Add admin_reply column to workshop_feedback
ALTER TABLE public.workshop_feedback ADD COLUMN IF NOT EXISTS admin_reply text;

-- Add graded_by_artist column to workshop_assignments
ALTER TABLE public.workshop_assignments ADD COLUMN IF NOT EXISTS graded_by_artist text;

-- Add video_type columns for 3 upload types (file, embed_link, external_link)
-- workshop_videos already has video_type, just ensure it supports our new values
