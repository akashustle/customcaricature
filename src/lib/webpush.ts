// Built-in Web Push Notification System (Self-hosted VAPID)
// No third-party dependency — uses own send-web-push edge function

import { supabase } from "@/integrations/supabase/client";

let initialized = false;

/**
 * Detect device info from user agent
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let deviceType = "desktop";
  let browser = "Unknown";
  let os = "Unknown";
  let deviceName = "";

  // Device type
  if (/Mobi|Android/i.test(ua)) deviceType = "mobile";
  else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

  // Browser detection
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  // OS detection
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) {
    const match = ua.match(/Android\s([\d.]+)/);
    os = match ? `Android ${match[1]}` : "Android";
  }
  else if (ua.includes("iPhone")) os = "iOS";
  else if (ua.includes("iPad")) os = "iPadOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Device name
  if (ua.includes("iPhone")) deviceName = "iPhone";
  else if (ua.includes("iPad")) deviceName = "iPad";
  else if (ua.includes("Pixel")) deviceName = "Google Pixel";
  else if (ua.includes("Samsung")) deviceName = "Samsung";
  else if (ua.includes("Macintosh")) deviceName = "Mac";

  return { deviceType, browser, os, deviceName };
};

/**
 * Get approximate location from timezone
 */
const getLocationInfo = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Extract city from timezone like "Asia/Kolkata" → "Kolkata"
  const parts = timezone.split("/");
  const city = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, " ") : "";
  return { timezone, city };
};

/**
 * Initialize the built-in web push system
 */
export const initWebPush = async (userId?: string) => {
  if (initialized) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    // Request permission immediately on visit
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Get VAPID public key from own edge function
    let vapidKey: string;
    try {
      const { data } = await supabase.functions.invoke("send-web-push", {
        body: { action: "get_vapid_key" },
      });
      vapidKey = data?.vapid_public_key;
      if (!vapidKey) return;
    } catch {
      return;
    }

    // Check existing subscription
    const existingSub = await registration.pushManager.getSubscription();

    // Convert VAPID key
    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const applicationServerKey = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) applicationServerKey[i] = rawData.charCodeAt(i);

    const subscription = existingSub || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");
    if (!key || !auth) return;

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    const subUserId = userId || "anonymous";
    const deviceInfo = getDeviceInfo();
    const locationInfo = getLocationInfo();

    // Check if already stored
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, welcome_sent")
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();

    if (!existing) {
      // New subscriber — insert with device info
      await supabase.from("push_subscriptions").insert({
        user_id: subUserId,
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device_name: deviceInfo.deviceName || null,
        city: locationInfo.city || null,
        timezone: locationInfo.timezone || null,
        is_active: true,
        welcome_sent: false,
      } as any);

      // Send welcome notification for logged-in users
      if (userId && userId !== "anonymous") {
        sendWelcomeNotification(userId);
      }
    } else {
      // Update last active and device info
      await supabase.from("push_subscriptions").update({
        user_id: subUserId !== "anonymous" ? subUserId : undefined,
        last_active_at: new Date().toISOString(),
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        is_active: true,
      } as any).eq("id", existing.id);

      // Send welcome if not sent yet and user is logged in
      if (userId && userId !== "anonymous" && !existing.welcome_sent) {
        sendWelcomeNotification(userId);
        await supabase.from("push_subscriptions").update({ welcome_sent: true } as any).eq("id", existing.id);
      }
    }

    initialized = true;
    console.log("Built-in Web Push initialized");
  } catch (err) {
    console.warn("Web Push init error:", err);
  }
};

/**
 * Send welcome notification to new subscriber
 */
const sendWelcomeNotification = async (userId: string) => {
  try {
    // Check if greeting already sent
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "greeting")
      .maybeSingle();
    if (existing) return;

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Welcome to CCC! 🎨",
      message: "Thanks for enabling notifications! You'll now receive updates about your orders, events, and exclusive offers even when you're away.",
      type: "greeting",
      link: "/dashboard",
    } as any);
  } catch {}
};

/**
 * Send push notification to a specific user
 */
export const sendWebPushNotification = async (params: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) => {
  const { data, error } = await supabase.functions.invoke("send-web-push", {
    body: {
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "broadcast",
      link: params.link || "/notifications",
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Broadcast push to multiple users
 */
export const broadcastWebPush = async (params: {
  title: string;
  message: string;
  link?: string;
  userIds: string[];
}) => {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of params.userIds) {
    try {
      const result = await sendWebPushNotification({
        userId,
        title: params.title,
        message: params.message,
        link: params.link,
      });
      totalSent += result?.sent || 0;
      totalFailed += result?.failed || 0;
    } catch {
      totalFailed++;
    }
  }

  return { sent: totalSent, failed: totalFailed };
};
