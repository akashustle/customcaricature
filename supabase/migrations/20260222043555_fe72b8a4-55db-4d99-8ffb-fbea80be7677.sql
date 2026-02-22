
-- Add edit/delete support to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

-- Allow users to update their own sent messages (for edit/delete)
CREATE POLICY "Users can update own sent messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
