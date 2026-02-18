
-- Add artist_id to artist_blocked_dates for per-artist date blocking
ALTER TABLE public.artist_blocked_dates 
ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artists(id) ON DELETE CASCADE;

-- RLS: Artists can manage own blocked dates
CREATE POLICY "Artists can insert own blocked dates"
ON public.artist_blocked_dates FOR INSERT
WITH CHECK (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Artists can update own blocked dates"
ON public.artist_blocked_dates FOR UPDATE
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Artists can delete own blocked dates"
ON public.artist_blocked_dates FOR DELETE
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "Artists can view own blocked dates"
ON public.artist_blocked_dates FOR SELECT
USING (artist_id IN (SELECT id FROM public.artists WHERE auth_user_id = auth.uid()));
