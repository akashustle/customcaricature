
-- Table to track AI chat conversations/sessions
CREATE TABLE public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_ip text,
  guest_name text,
  guest_email text,
  guest_city text,
  status text NOT NULL DEFAULT 'active',
  admin_joined boolean NOT NULL DEFAULT false,
  admin_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table to store individual messages in AI chat conversations
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  sender_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for ai_chat_sessions
CREATE POLICY "Admins can manage all AI chat sessions"
  ON public.ai_chat_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own AI chat sessions"
  ON public.ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create AI chat sessions"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own AI chat sessions"
  ON public.ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS for ai_chat_messages
CREATE POLICY "Admins can manage all AI chat messages"
  ON public.ai_chat_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own session messages"
  ON public.ai_chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM public.ai_chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert AI chat messages"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (true);

-- Enable realtime for admin to see live conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;

-- Trigger for updated_at
CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
