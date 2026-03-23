// Built-in Web Push Notification System (Self-hosted VAPID)
import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_ICON = "/logo.png";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const encodeKey = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

const applicationServerKeyMatches = (currentKey: Uint8Array, existingKey?: ArrayBuffer | null) => {
  if (!existingKey) return false;
  const current = Array.from(currentKey);
  const existing = Array.from(new Uint8Array(existingKey));
  return current.length === existing.length && current.every((value, index) => value === existing[index]);
};

const showLocalWelcomeNotification = async (registration: ServiceWorkerRegistration) => {
  try {
    await registration.showNotification("Welcome to CCC! 🎨", {
      body: "Thanks for enabling notifications. You’ll now get order updates, event alerts, and special offers.",
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: "ccc-welcome",
      data: { url: "/notifications" },
    });
  } catch {}
};

/**
 * Detect device info from user agent
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let deviceType = "desktop";
  let browser = "Unknown";
  let os = "Unknown";
  let deviceName = "";

  if (/Mobi|Android/i.test(ua)) deviceType = "mobile";
  else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

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

  if (ua.includes("iPhone")) deviceName = "iPhone";
  else if (ua.includes("iPad")) deviceName = "iPad";
  else if (ua.includes("Pixel")) deviceName = "Google Pixel";
  else if (ua.includes("Samsung")) deviceName = "Samsung";
  else if (ua.includes("Macintosh")) deviceName = "Mac";

  return { deviceType, browser, os, deviceName };
};

const getLocationInfo = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = timezone.split("/");
  const city = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, " ") : "";
  return { timezone, city };
};

/**
 * Initialize push — called on every page load, safe to call multiple times
 */
export const initWebPush = async (userId?: string) => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Web Push not supported in this browser");
    return;
  }

  try {
    // Register service worker first
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;
    console.log("SW registered for push");

    const currentPermission = Notification.permission;
    console.log("Current notification permission:", currentPermission);

    if (currentPermission === "denied") {
      console.warn("Notifications blocked by user");
      return;
    }

    if (currentPermission !== "granted") return;

    // Get VAPID public key
    let vapidKey: string;
    try {
      const { data } = await supabase.functions.invoke("send-web-push", {
        body: { action: "get_vapid_key" },
      });
      vapidKey = data?.vapid_public_key;
      if (!vapidKey) {
        console.warn("No VAPID key returned");
        return;
      }
    } catch (e) {
      console.warn("Failed to get VAPID key:", e);
      return;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    let existingSub = await registration.pushManager.getSubscription();

    if (existingSub && !applicationServerKeyMatches(applicationServerKey, existingSub.options?.applicationServerKey ?? null)) {
      const staleEndpoint = existingSub.endpoint;
      await existingSub.unsubscribe().catch(() => undefined);
      await supabase.from("push_subscriptions").delete().eq("endpoint", staleEndpoint);
      existingSub = null;
      console.log("Old push subscription rotated to current VAPID key");
    }

    const subscription = existingSub || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");
    if (!key || !auth) return;

    const p256dh = encodeKey(key);
    const authKey = encodeKey(auth);

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
        welcome_sent: true,
      } as any);

      // Only show ONE welcome — local notification only (no DB insert to avoid double-send via trigger)
      await showLocalWelcomeNotification(registration);
      console.log("New push subscriber registered");
    } else {
      await supabase.from("push_subscriptions").update({
        user_id: subUserId !== "anonymous" ? subUserId : undefined,
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
        last_active_at: new Date().toISOString(),
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device_name: deviceInfo.deviceName || null,
        city: locationInfo.city || null,
        timezone: locationInfo.timezone || null,
        is_active: true,
      } as any).eq("id", existing.id);
    }

    console.log("Web Push initialized successfully");
  } catch (err) {
    console.warn("Web Push init error:", err);
  }
};

const sendWelcomeNotification = async (userId: string) => {
  try {
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
      message: "Thanks for enabling notifications! You'll now receive updates about your orders, events, and exclusive offers.",
      type: "greeting",
      link: "/dashboard",
    } as any);
  } catch {}
};

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

export const requestBrowserNotificationPermission = async (userId?: string) => {
  if (!("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") {
    await initWebPush(userId);
    return "granted" as const;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await initWebPush(userId);
  }
  return permission;
};

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
