// Service worker for push notifications — hardened against spam/duplicates

// Rate-limit + dedup state (in-memory, resets on SW restart which is fine)
const recentNotifications = new Map(); // tag → timestamp
const DEDUP_WINDOW_MS = 5000; // ignore duplicate tags within 5 seconds
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_NOTIFICATIONS_PER_MINUTE = 5;
let notificationTimestamps = [];

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', function(event) {
  let data = { title: 'Creative Caricature Club', body: 'You have a new notification', icon: '/logo.png', badge: '/logo.png', url: '/notifications' };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const tag = data.tag || 'ccc-notification';
  const now = Date.now();

  // Dedup: skip if same tag was shown very recently
  if (recentNotifications.has(tag)) {
    const lastShown = recentNotifications.get(tag);
    if (now - lastShown < DEDUP_WINDOW_MS) {
      console.log('[SW] Dedup: skipping duplicate notification', tag);
      return;
    }
  }

  // Rate limit: max N notifications per minute
  notificationTimestamps = notificationTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (notificationTimestamps.length >= MAX_NOTIFICATIONS_PER_MINUTE) {
    console.log('[SW] Rate limit: too many notifications, skipping');
    return;
  }

  recentNotifications.set(tag, now);
  notificationTimestamps.push(now);

  // Clean old dedup entries
  for (const [k, v] of recentNotifications) {
    if (now - v > 30000) recentNotifications.delete(k);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    tag: tag,
    renotify: false,
    data: { url: data.url || '/notifications' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data?.url || '/notifications';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
