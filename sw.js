/* Service worker mínimo: hace que la web sea instalable.
   No guarda nada en caché a propósito: los precios siempre se piden en directo. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
