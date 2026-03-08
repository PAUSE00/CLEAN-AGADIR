const CACHE_NAME = 'clean-agadir-v1';

const PRECACHE_ASSETS = [
    '/offline.html',
    '/manifest.json',
    '/icons/icon.svg',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Basic network-first strategy for navigation and assets
    // Ignore non-GET requests (POST, PUT, DELETE) (important for Laravel CSRF API)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                // If network fails, look in cache
                return caches.match(event.request).then(response => {
                    if (response) return response;

                    // If it's a page navigation request and nothing in cache, show offline page
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                });
            })
    );
});
