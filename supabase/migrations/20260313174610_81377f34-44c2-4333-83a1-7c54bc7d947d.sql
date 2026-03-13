ALTER TABLE public.workshop_online_attendance_prompts
ADD COLUMN IF NOT EXISTS target_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_workshop_online_attendance_prompts_target_user
ON public.workshop_online_attendance_prompts (target_user_id);

CREATE INDEX IF NOT EXISTS idx_workshop_online_attendance_prompts_active
ON public.workshop_online_attendance_prompts (is_active, session_date, slot, updated_at DESC);