
-- Live chat sessions table
CREATE TABLE public.live_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  user_email text,
  user_phone text,
  user_address text,
  service_type text NOT NULL DEFAULT 'custom', -- 'custom' or 'event'
  status text NOT NULL DEFAULT 'flow', -- 'flow', 'waiting', 'admin_joined', 'ended'
  admin_name text,
  admin_user_id uuid,
  -- collected data
  caricature_type text, -- single/couple/group
  face_count integer,
  estimated_price integer,
  event_date date,
  event_time text,
  event_state text,
  event_district text,
  event_city text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  browser_session_id text NOT NULL -- to link anonymous users
);

-- Live chat messages table
CREATE TABLE public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'system', -- 'system', 'user', 'admin'
  sender_name text,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text', -- 'text', 'options', 'input'
  options jsonb, -- for option buttons
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can create sessions (anonymous users)
CREATE POLICY "Anyone can create live chat sessions"
ON public.live_chat_sessions FOR INSERT
WITH CHECK (true);

-- RLS: Users can view own session by browser_session_id
CREATE POLICY "Anyone can view own live chat sessions"
ON public.live_chat_sessions FOR SELECT
USING (true);

-- RLS: Anyone can update sessions (for status changes)
CREATE POLICY "Anyone can update live chat sessions"
ON public.live_chat_sessions FOR UPDATE
USING (true);

-- RLS: Admins can manage all sessions
CREATE POLICY "Admins can manage all live chat sessions"
ON public.live_chat_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages policies
CREATE POLICY "Anyone can insert live chat messages"
ON public.live_chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view live chat messages"
ON public.live_chat_messages FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all live chat messages"
ON public.live_chat_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
