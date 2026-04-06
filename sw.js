const TOKA_CACHE_VERSION = 'toka-shell-v13';
const TOKA_CACHE_ASSETS = [
    './',
    './index.html',
    './style.css?v=20260406-4',
    './supabase-config.js?v=20260405-3',
    './data.js?v=20260406-10',
    './app.js?v=20260406-4',
    './host-dashboard-controller.js?v=20260406-5',
    './manifest.webmanifest?v=20260405-1',
    './vendor/qrcode.min.js?v=20260405-1',
    './favicon.ico',
    './favicon.svg',
    './apple-touch-icon.png',
    './public/icons/icon-192.png',
    './public/icons/icon-512.png',
    './public/icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(TOKA_CACHE_VERSION).then((cache) => cache.addAll(TOKA_CACHE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                .filter((key) => key !== TOKA_CACHE_VERSION)
                .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }
            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const copy = response.clone();
                    caches.open(TOKA_CACHE_VERSION).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => cached);
        })
    );
});