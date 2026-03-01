
-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_artist ON public.orders(assigned_artist_id);

CREATE INDEX IF NOT EXISTS idx_event_bookings_user_id ON public.event_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_date ON public.event_bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_event_bookings_status ON public.event_bookings(status);
CREATE INDEX IF NOT EXISTS idx_event_bookings_city_date ON public.event_bookings(city, event_date);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_booking ON public.payment_history(booking_id);

CREATE INDEX IF NOT EXISTS idx_customer_event_pricing_user ON public.customer_event_pricing(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_intl_pricing_user ON public.customer_international_event_pricing(user_id);

CREATE INDEX IF NOT EXISTS idx_event_artist_assignments_event ON public.event_artist_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_artist_assignments_artist ON public.event_artist_assignments(artist_id);

CREATE INDEX IF NOT EXISTS idx_artist_blocked_dates_artist ON public.artist_blocked_dates(artist_id, blocked_date);

CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_browser ON public.live_chat_sessions(browser_session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session ON public.live_chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_intl_pricing_country ON public.international_event_pricing(country, artist_count);

-- Artist documents table
CREATE TABLE IF NOT EXISTS public.artist_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'passport',
  file_name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage artist documents" ON public.artist_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Artists can view own documents" ON public.artist_documents FOR SELECT TO authenticated USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can view artist docs for their events" ON public.artist_documents FOR SELECT TO authenticated USING (
  artist_id IN (
    SELECT eaa.artist_id FROM event_artist_assignments eaa
    JOIN event_bookings eb ON eb.id = eaa.event_id
    WHERE eb.user_id = auth.uid()
  )
);

-- Flight tickets table
CREATE TABLE IF NOT EXISTS public.event_flight_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_flight_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flight tickets" ON public.event_flight_tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage own event flight tickets" ON public.event_flight_tickets FOR ALL TO authenticated 
  USING (event_id IN (SELECT id FROM event_bookings WHERE user_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM event_bookings WHERE user_id = auth.uid()));
CREATE POLICY "Artists can view flight tickets for assigned events" ON public.event_flight_tickets FOR SELECT TO authenticated USING (
  event_id IN (
    SELECT eaa.event_id FROM event_artist_assignments eaa
    JOIN artists a ON a.id = eaa.artist_id
    WHERE a.auth_user_id = auth.uid()
  )
);

-- Enable realtime for flight tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_flight_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_documents;

-- Storage bucket for artist documents and flight tickets
INSERT INTO storage.buckets (id, name, public) VALUES ('event-documents', 'event-documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Admins can manage event documents" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'event-documents' AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (bucket_id = 'event-documents' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can upload event documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view event documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'event-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own event documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-documents' AND auth.uid() IS NOT NULL);
