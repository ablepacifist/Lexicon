// Service Worker for Lexicon Push Notifications
// This file MUST be in /public so it's served at the root scope

self.addEventListener('push', function(event) {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Lexicon', body: event.data.text() };
    }

    const options = {
        body: data.body || '',
        icon: '/logo192.png',
        badge: '/favicon.ico',
        data: {
            url: data.url || '/',
            ...data.data
        },
        vibrate: [200, 100, 200],
        tag: data.tag || 'lexicon-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Lexicon', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Focus existing window if open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window
            return clients.openWindow(url);
        })
    );
});

self.addEventListener('pushsubscriptionchange', function(event) {
    // Re-subscribe if subscription expires
    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then(function(subscription) {
                // Notify the server of the new subscription
                return fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
                            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
                        }
                    })
                });
            })
    );
});
