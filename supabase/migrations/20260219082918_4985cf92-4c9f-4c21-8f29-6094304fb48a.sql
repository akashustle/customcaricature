
-- FIX 1: Artists table - restrict public SELECT to only name (hide email/mobile from public)
DROP POLICY "Anyone can view artists" ON public.artists;

CREATE POLICY "Authenticated users can view artists"
ON public.artists FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.event_artist_assignments eaa
    JOIN public.event_bookings eb ON eb.id = eaa.event_id
    WHERE eaa.artist_id = artists.id AND eb.user_id = auth.uid()
  )
);

-- FIX 2: Live chat sessions - restrict SELECT to session owner (by browser_session_id) and admins
DROP POLICY "Anyone can view own live chat sessions" ON public.live_chat_sessions;

CREATE POLICY "Users can view own live chat sessions"
ON public.live_chat_sessions FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR browser_session_id = coalesce(current_setting('request.headers', true)::json->>'x-browser-session-id', '')
);

-- Also restrict UPDATE
DROP POLICY "Anyone can update live chat sessions" ON public.live_chat_sessions;

CREATE POLICY "Admins or session owner can update live chat sessions"
ON public.live_chat_sessions FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR browser_session_id = coalesce(current_setting('request.headers', true)::json->>'x-browser-session-id', '')
);

-- Restrict live chat messages SELECT too
DROP POLICY "Anyone can view live chat messages" ON public.live_chat_messages;

CREATE POLICY "Admins can view all live chat messages"
ON public.live_chat_messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR session_id IN (
    SELECT id FROM public.live_chat_sessions
    WHERE browser_session_id = coalesce(current_setting('request.headers', true)::json->>'x-browser-session-id', '')
  )
);

-- FIX 3: Order images - fix INSERT policy and add user SELECT
DROP POLICY "Anyone can insert order images" ON public.order_images;

CREATE POLICY "Users can upload own order images"
ON public.order_images FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own order images"
ON public.order_images FOR SELECT TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  )
);

-- Artists can also view order images for their assigned orders
CREATE POLICY "Artists can view assigned order images"
ON public.order_images FOR SELECT TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE assigned_artist_id IN (
      SELECT id FROM public.artists WHERE auth_user_id = auth.uid()
    )
  )
);
