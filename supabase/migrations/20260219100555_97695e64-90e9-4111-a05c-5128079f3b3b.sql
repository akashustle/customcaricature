
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Only service role can insert (from edge functions/triggers)
CREATE POLICY "Service role insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

-- Create a trigger function to auto-create notifications on order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Order Update',
      'Your order status changed to ' || REPLACE(NEW.status::text, '_', ' '),
      'order',
      '/dashboard'
    );
  END IF;
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Payment Update',
      'Payment status updated to ' || COALESCE(NEW.payment_status, 'unknown'),
      'payment',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_order_status_notification
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

-- Create a trigger for event booking status changes
CREATE OR REPLACE FUNCTION public.notify_event_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Event Update',
      'Your event booking status changed to ' || NEW.status,
      'event',
      '/dashboard'
    );
  END IF;
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Event Payment',
      'Event payment status updated to ' || NEW.payment_status,
      'payment',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_event_status_notification
AFTER UPDATE ON public.event_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_status_change();

-- Create trigger for chat message notifications
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin = true AND NEW.receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.receiver_id,
      'New Message',
      'You have a new message from admin',
      'chat',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_chat_notification
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message();
