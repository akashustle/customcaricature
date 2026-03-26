
-- Trigger: when a notification is inserted, fire web push
CREATE OR REPLACE TRIGGER on_notification_web_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_web_push();

-- Trigger: order status/payment changes → insert notification for user
CREATE OR REPLACE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Trigger: event status/payment changes → insert notification for user
CREATE OR REPLACE TRIGGER on_event_status_change
  AFTER UPDATE ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_status_change();

-- Trigger: chat message → insert notification for receiver
CREATE OR REPLACE TRIGGER on_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- Trigger: new event booking → notify all admins
CREATE OR REPLACE TRIGGER on_new_event_booking
  AFTER INSERT ON public.event_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_event();

-- Trigger: new order → notify all admins
CREATE OR REPLACE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_order();

-- Trigger: new user profile → notify all admins
CREATE OR REPLACE TRIGGER on_new_user_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_user();

-- Trigger: new enquiry → notify all admins
CREATE OR REPLACE TRIGGER on_new_enquiry
  AFTER INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_enquiry();

-- Trigger: generate display_id for profiles
CREATE OR REPLACE TRIGGER on_profile_display_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_display_id();

-- Trigger: generate enquiry number
CREATE OR REPLACE TRIGGER on_enquiry_number
  BEFORE INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_enquiry_number();

-- Trigger: generate shop order number
CREATE OR REPLACE TRIGGER on_shop_order_number
  BEFORE INSERT ON public.shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_shop_order_number();

-- Trigger: generate invoice number
CREATE OR REPLACE TRIGGER on_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();
