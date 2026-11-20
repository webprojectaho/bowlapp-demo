// Service worker: tiene l'app in cache così si apre anche senza rete (in sala il segnale spesso manca).
// Strategia: risponde subito dalla cache e intanto scarica la versione nuova, che si vede alla riapertura.
const V = 'bowl-0.10.0-d09f9a25';
const FONT = 'bowl-fonts';
const SHELL = ['./', 'index.html', '3d.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V && k !== FONT).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!same && !font) return;
  // Ogni apertura della pagina usa la stessa copia di index.html.
  const key = same && r.mode === 'navigate' ? 'index.html' : r;
  e.respondWith(
    caches.open(same ? V : FONT).then(async c => {
      const hit = await c.match(key);
      const net = fetch(r)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone());
          return res;
        })
        .catch(() => hit);
      if (hit) {
        e.waitUntil(net);
        return hit;
      }
      return net;
    })
  );
});
