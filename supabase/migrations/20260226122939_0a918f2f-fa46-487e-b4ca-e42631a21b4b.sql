
CREATE TABLE IF NOT EXISTS public.chatbot_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chatbot training data" ON public.chatbot_training_data
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active training data" ON public.chatbot_training_data
  FOR SELECT USING (is_active = true);
