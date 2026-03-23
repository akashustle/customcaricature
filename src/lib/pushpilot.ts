// PushPilot Web Push Integration
const APP_ID = "77b857cf437b4ef1c5bdcea8";
const API_BASE = "https://wtejlokqeveqaqzbnium.supabase.co/functions/v1";
const VAPID_KEY = "BPvn36jqlidn-Uafjx5TlktnTThVzhpYHD6hgRdI-gyY1RoqUS8toF7c4rVD7eZF0ZDzSs6rVmxlW0AL-pecyis";

let initialized = false;

export const initPushPilot = async () => {
  if (initialized) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const sw = await navigator.serviceWorker.register('/pushpilot-sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_KEY,
    });

    const sub = subscription.toJSON();
    await fetch(API_BASE + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        endpoint: sub.endpoint,
        p256dh_key: sub.keys?.p256dh,
        auth_key: sub.keys?.auth,
      }),
    });

    initialized = true;
    console.log("PushPilot initialized");
  } catch (err) {
    console.warn("PushPilot init error:", err);
  }
};

export const sendPushPilotNotification = async (params: {
  title: string;
  message: string;
  icon_url?: string;
  image_url?: string;
  click_url?: string;
  scheduled_at?: string;
}) => {
  const res = await fetch(API_BASE + '/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: "5f5edb6a4713374af9b1e6483406a582a49deb095c8341030ff710d311404394",
      app_id: APP_ID,
      title: params.title,
      message: params.message,
      icon_url: params.icon_url || 'https://customcaricature.lovable.app/logo.png',
      image_url: params.image_url || undefined,
      click_url: params.click_url || undefined,
      scheduled_at: params.scheduled_at || undefined,
    }),
  });
  return res.json();
};
