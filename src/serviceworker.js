/* eslint-disable array-callback-return */
/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable compat/compat */
/* eslint-disable no-restricted-globals */
/* eslint-env serviceworker */

const CACHE_NAME = 'media-cache-v1';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([
                '/music.html' // Offline fallback page
                // Add other URLs of resources to cache, e.g., CSS, JS, images
                // '/styles.css',
                // '/script.js',
                // '/images/logo.png',
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Cache-first strategy for media files
    if (url.pathname.startsWith('/Audio/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        return caches.match('/music.html'); // Offline fallback page
                    });
                });
            }).catch(() => {
                return caches.match('/music.html'); // Offline fallback page
            })
        );
    } else {
        // Default handling for other requests
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    return caches.match('/music.html'); // Offline fallback page
                });
            }).catch(() => {
                return caches.match('/music.html'); // Offline fallback page
            })
        );
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('notificationclick', event => {
    const notification = event.notification;
    notification.close();

    const data = notification.data;
    const serverId = data.serverId;
    const action = event.action;

    if (!action) {
        clients.openWindow('/music.html'); // Redirect to offline page
        event.waitUntil(Promise.resolve());
        return;
    }

    event.waitUntil(
        executeAction(action, data, serverId)
    );
});

function executeAction(action, data, serverId) {
    return getApiClient(serverId)
        .then(apiClient => {
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
        .catch(error => {
            console.error('API Client unavailable or action failed', error);
            clients.openWindow('/');
            return Promise.resolve();
        });
}

function getApiClient(serverId) {
    if (typeof window === 'undefined' || !window.connectionManager) {
        return Promise.reject('Connection Manager not available');
    }
    return Promise.resolve(window.connectionManager.getApiClient(serverId));
}
