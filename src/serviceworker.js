/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable compat/compat */
/* eslint-disable no-restricted-globals */
/* eslint-env serviceworker */

const CACHE_NAME = 'media-cache';

function getApiClient(serverId) {
    if (typeof window === 'undefined' || !window.connectionManager) {
        return Promise.reject('Connection Manager not available');
    }
    return Promise.resolve(window.connectionManager.getApiClient(serverId));
}

function executeAction(action, data, serverId) {
    return getApiClient(serverId)
        .then((apiClient) => {
            switch (action) {
                case 'cancel-install':
                    return apiClient.cancelPackageInstallation(data.id);
                case 'restart':
                    return apiClient.restartServer();
                default:
                    clients.openWindow('/');
                    return Promise.resolve();
            }
        })
        .catch((error) => {
            console.error('API Client unavailable or action failed', error);
            clients.openWindow('/');
            return Promise.resolve();
        });
}

self.addEventListener('notificationclick', function (event) {
    const notification = event.notification;
    notification.close();

    const data = notification.data;
    const serverId = data.serverId;
    const action = event.action;

    if (!action) {
        clients.openWindow('/');
        event.waitUntil(Promise.resolve());
        return;
    }

    event.waitUntil(executeAction(action, data, serverId));
}, false);

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                // eslint-disable-next-line array-callback-return
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Cache hit: return the cached response
                    return cachedResponse;
                }

                // Cache miss: fetch from the network
                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }

                    // Cache the fetched response for future use
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Fallback to a default offline response or cached page if needed
                    return caches.match('/offline.html');
                });
            });
        })
    );
});
