
-- Add unique constraint on workshop_admins user_id for upsert
ALTER TABLE public.workshop_admins ADD CONSTRAINT workshop_admins_user_id_key UNIQUE (user_id);
