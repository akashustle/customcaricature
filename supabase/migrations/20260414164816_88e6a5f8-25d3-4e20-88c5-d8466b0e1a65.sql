
-- Fix: ai_chat_sessions - remove overly permissive guest SELECT policy
-- Replace with header-scoped access so guests can only view their own session
DROP POLICY IF EXISTS "Guests can view sessions without user_id" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Guests can view messages in guest sessions" ON public.ai_chat_messages;

-- Guest can only view their own session (matched by session ID in header)
CREATE POLICY "Guests can view own session via header"
ON public.ai_chat_sessions FOR SELECT
TO anon, authenticated
USING (
  id::text = coalesce(
    current_setting('request.headers', true)::json->>'x-guest-session-id',
    ''
  )
);

-- Guest can only view messages in their own session (matched by header)
CREATE POLICY "Guests can view own session messages via header"
ON public.ai_chat_messages FOR SELECT
TO anon, authenticated
USING (
  session_id::text = coalesce(
    current_setting('request.headers', true)::json->>'x-guest-session-id',
    ''
  )
);
