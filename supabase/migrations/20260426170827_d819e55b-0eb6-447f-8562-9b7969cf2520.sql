
-- Scheduled deletion fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_reason text,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_message text;

-- Index for the cron processor
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion_at
  ON public.profiles (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;
