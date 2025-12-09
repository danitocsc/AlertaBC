const CACHE_NAME = 'alerta-bc-v1';

self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic passthrough. 
    // In a real PWA you might want caching strategies here.
    event.respondWith(fetch(event.request));
});

// Listen for push notifications (if implemented in future)
self.addEventListener('push', function (event) {
    if (event.data) {
        const payload = event.data.json();
        const options = {
            body: payload.body,
            icon: '/static/icon.svg',
            badge: '/static/icon.svg',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            }
        };
        event.waitUntil(
            self.registration.showNotification(payload.title, options)
        );
    }
});
