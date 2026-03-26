
-- Attach trigger: notify on order status/payment change
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Attach trigger: notify on event booking status/payment change
CREATE TRIGGER on_event_status_change
  AFTER UPDATE ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_status_change();

-- Attach trigger: notify on new chat message
CREATE TRIGGER on_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- Attach trigger: notify admins on new event booking
CREATE TRIGGER on_new_event_booking
  AFTER INSERT ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_event();

-- Attach trigger: notify admins on new user registration
CREATE TRIGGER on_new_user_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_user();

-- Attach trigger: notify admins on new order
CREATE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_order();

-- Attach trigger: notify admins on new enquiry
CREATE TRIGGER on_new_enquiry
  AFTER INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_enquiry();

-- Attach trigger: send web push when notification is inserted
CREATE TRIGGER on_notification_web_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_web_push();

-- Attach trigger: generate display_id for profiles
CREATE TRIGGER on_profile_generate_display_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_display_id();

-- Attach trigger: generate enquiry number
CREATE TRIGGER on_enquiry_generate_number
  BEFORE INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_enquiry_number();

-- Attach trigger: generate invoice number
CREATE TRIGGER on_invoice_generate_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();

-- Attach trigger: update updated_at on orders
CREATE TRIGGER on_order_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Attach trigger: update updated_at on event_bookings
CREATE TRIGGER on_event_updated_at
  BEFORE UPDATE ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
