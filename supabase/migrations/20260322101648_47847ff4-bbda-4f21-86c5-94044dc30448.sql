
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS extended_delivery_date date,
ADD COLUMN IF NOT EXISTS extension_reason text,
ADD COLUMN IF NOT EXISTS preview_image_url text,
ADD COLUMN IF NOT EXISTS timeline_logs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'order_placed',
ADD COLUMN IF NOT EXISTS artist_message text;
