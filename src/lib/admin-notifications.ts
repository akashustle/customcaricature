// Admin push notification helper — sends notifications to all admins
import { supabase } from "@/integrations/supabase/client";

/**
 * Send a notification to all admin users (inserts into notifications table,
 * which triggers web push via the trigger_web_push database trigger).
 */
export const notifyAdmins = async (params: {
  title: string;
  message: string;
  type?: string;
  link?: string;
}) => {
  try {
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin") as any;

    if (!admins || admins.length === 0) return;

    const notifications = (admins as { user_id: string }[]).map(a => ({
      user_id: a.user_id,
      title: params.title,
      message: params.message,
      type: params.type || "broadcast",
      link: params.link || "/admin-panel",
    }));

    await supabase.from("notifications").insert(notifications as any);
  } catch (err) {
    console.warn("Admin notification failed:", err);
  }
};

/**
 * Notify admins about a user visit (throttled — max once per user per 10 min)
 */
const visitCache = new Map<string, number>();

export const notifyAdminUserVisit = async (userId?: string) => {
  const key = userId || "anonymous";
  const now = Date.now();
  const last = visitCache.get(key);
  if (last && now - last < 600000) return; // 10 min throttle
  visitCache.set(key, now);

  await notifyAdmins({
    title: "👀 User Visit",
    message: userId ? `A logged-in user is browsing the website` : "An anonymous visitor is on the website",
    type: "broadcast",
    link: "/admin-panel",
  });
};

export const notifyAdminUserLogin = async (name: string, email: string) => {
  await notifyAdmins({
    title: "🔑 User Login",
    message: `${name || "User"} (${email}) just logged in`,
    type: "broadcast",
    link: "/admin-panel",
  });
};

export const notifyAdminNewAccount = async (name: string, email: string) => {
  await notifyAdmins({
    title: "🆕 New Account Created",
    message: `${name || "User"} (${email}) just registered`,
    type: "broadcast",
    link: "/admin-panel",
  });
};

export const notifyAdminNewOrder = async (customerName: string, amount: number) => {
  await notifyAdmins({
    title: "📦 New Order",
    message: `Order from ${customerName} — ₹${amount}`,
    type: "order",
    link: "/admin-panel",
  });
};

export const notifyAdminEventBooked = async (clientName: string, eventDate: string, city: string) => {
  await notifyAdmins({
    title: "🎉 Event Booked",
    message: `${clientName} booked event on ${eventDate} at ${city}`,
    type: "event",
    link: "/admin-panel",
  });
};

export const notifyAdminNewEnquiry = async (name: string, type: string) => {
  await notifyAdmins({
    title: "📝 New Enquiry",
    message: `${name} sent a ${type} enquiry`,
    type: "broadcast",
    link: "/admin-panel",
  });
};

export const notifyAdminPayment = async (amount: number, customerName: string) => {
  await notifyAdmins({
    title: "💰 Payment Received",
    message: `₹${amount} received from ${customerName}`,
    type: "payment",
    link: "/admin-panel",
  });
};
