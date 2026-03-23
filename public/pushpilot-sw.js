self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    image: data.image || undefined,
    data: { url: data.url || '/', notification_id: data.notification_id, tracking_url: data.tracking_url },
    vibrate: [200, 100, 200],
    actions: data.url ? [{ action: 'open', title: 'Open' }] : []
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const d = event.notification.data || {};
  if (d.notification_id && d.tracking_url) {
    fetch(d.tracking_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_id: d.notification_id }) }).catch(() => {});
  }
  if (d.url) event.waitUntil(clients.openWindow(d.url));
});
