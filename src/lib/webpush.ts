// Built-in Web Push Notification System (Self-hosted VAPID)
// No third-party dependency — uses own send-web-push edge function

import { supabase } from "@/integrations/supabase/client";

let initialized = false;

/**
 * Initialize the built-in web push system:
 * 1. Register service worker (sw-push.js)
 * 2. Request notification permission
 * 3. Subscribe to push via own VAPID key
 * 4. Store subscription in push_subscriptions table
 */
export const initWebPush = async (userId?: string) => {
  if (initialized) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // Register own service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Get VAPID public key from own edge function
    let vapidKey: string;
    try {
      const { data } = await supabase.functions.invoke("send-web-push", {
        body: { action: "get_vapid_key" },
      });
      vapidKey = data?.vapid_public_key;
      if (!vapidKey) {
        console.warn("No VAPID key configured");
        return;
      }
    } catch {
      console.warn("Failed to fetch VAPID key");
      return;
    }

    // Check existing subscription
    const existingSub = await registration.pushManager.getSubscription();

    // Convert VAPID key to Uint8Array
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

    // Store subscription — use provided userId or "anonymous"
    const subUserId = userId || "anonymous";

    // Check if already stored
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();

    if (!existing) {
      await supabase.from("push_subscriptions").insert({
        user_id: subUserId,
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
      } as any);
    }

    initialized = true;
    console.log("Built-in Web Push initialized");
  } catch (err) {
    console.warn("Web Push init error:", err);
  }
};

/**
 * Send push notification to specific user(s) via own edge function
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
 * Send push to ALL subscribers by iterating through push_subscriptions
 * This is used for broadcast notifications from admin
 */
export const broadcastWebPush = async (params: {
  title: string;
  message: string;
  link?: string;
  userIds: string[];
}) => {
  let totalSent = 0;
  let totalFailed = 0;

  // Send to each user via the edge function
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
