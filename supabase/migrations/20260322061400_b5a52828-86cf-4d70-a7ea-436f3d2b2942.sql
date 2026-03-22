
-- Create function to notify admins on new user registration
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '🆕 New User Registered',
        'New user: ' || COALESCE(NEW.full_name, 'Unknown') || ' (' || COALESCE(NEW.email, '') || ')',
        'broadcast',
        '/admin-panel'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Admin notification failed: %', SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create function to notify admins on new order
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '📦 New Order Received',
        'Order from ' || COALESCE(NEW.customer_name, 'Unknown') || ' - ₹' || NEW.amount || ' (' || NEW.caricature_type::text || ')',
        'order',
        '/admin-panel'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Admin order notification failed: %', SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create function to notify admins on new event booking
CREATE OR REPLACE FUNCTION public.notify_admin_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '🎉 New Event Booking',
        'Event by ' || COALESCE(NEW.client_name, 'Unknown') || ' on ' || NEW.event_date || ' at ' || COALESCE(NEW.city, 'Unknown') || ' - ₹' || NEW.total_price,
        'event',
        '/admin-panel'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Admin event notification failed: %', SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create function to notify admins on new enquiry
CREATE OR REPLACE FUNCTION public.notify_admin_new_enquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '📝 New Enquiry',
        'Enquiry from ' || COALESCE(NEW.name, 'Unknown') || ' (' || COALESCE(NEW.mobile, '') || ') - ' || COALESCE(NEW.enquiry_type, 'general'),
        'broadcast',
        '/admin-panel'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Admin enquiry notification failed: %', SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_notify_admin_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

CREATE TRIGGER trg_notify_admin_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_order();

CREATE TRIGGER trg_notify_admin_new_event
  AFTER INSERT ON public.event_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_event();

CREATE TRIGGER trg_notify_admin_new_enquiry
  AFTER INSERT ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_enquiry();
