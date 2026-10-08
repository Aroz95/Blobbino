// Blobbino: funziona anche offline.
// PREFIX, VERSION e SHELL li scrive la build (vite.config.js): ogni pubblicazione ha la sua versione.
const PREFIX = '__CACHE_PREFIX__';
const VERSION = '__VERSION__';
const SHELL = __SHELL__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // solo le proprie: sullo stesso dominio può esserci anche l'altra versione di Blobbino
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pagina: prima la rete (così ricevi gli aggiornamenti), poi la copia salvata.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(new URL('./index.html?fresh=' + Date.now(), self.registration.scope).href, {cache: 'no-store', credentials: 'same-origin'})
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Font e file dell'app: prima la copia salvata, poi la rete.
  if (url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
      }))
    );
  }
});
