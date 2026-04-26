-- Sync queue health: each client periodically reports its pending counts so
-- admins can monitor the live offline backlog across all users (mobile + web).

CREATE TABLE IF NOT EXISTS public.sync_queue_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  device_type TEXT NOT NULL DEFAULT 'web',
  user_agent TEXT,
  pending_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  syncing_count INTEGER NOT NULL DEFAULT 0,
  oldest_queued_at TIMESTAMPTZ,
  last_error TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_health_client ON public.sync_queue_health (client_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_health_pending ON public.sync_queue_health (pending_count DESC, reported_at DESC) WHERE pending_count > 0;
CREATE INDEX IF NOT EXISTS idx_sync_queue_health_failed ON public.sync_queue_health (failed_count DESC, reported_at DESC) WHERE failed_count > 0;

ALTER TABLE public.sync_queue_health ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated app instances) may insert their heartbeat —
-- the data contains no secrets, only counters. Reads are admin-only.
CREATE POLICY "anyone_can_report_sync_health"
ON public.sync_queue_health
FOR INSERT
WITH CHECK (true);

CREATE POLICY "admins_can_read_sync_health"
ON public.sync_queue_health
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins_can_delete_sync_health"
ON public.sync_queue_health
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));