
-- Allow guests (anonymous) to view their own chat sessions (where user_id IS NULL)
CREATE POLICY "Guests can view sessions without user_id"
ON public.ai_chat_sessions
FOR SELECT
TO anon, authenticated
USING (user_id IS NULL);

-- Allow guests to view messages in sessions without user_id
CREATE POLICY "Guests can view messages in guest sessions"
ON public.ai_chat_messages
FOR SELECT
TO anon, authenticated
USING (session_id IN (
  SELECT id FROM ai_chat_sessions WHERE user_id IS NULL
));
