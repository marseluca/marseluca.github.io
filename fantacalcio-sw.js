/* Service worker dell'app Asta Fantacalcio: tiene tutto offline. */
const CACHE = "asta-fantacalcio-v17";
const ASSETS = [
  "./fantacalcio.html",
  "./listone-2026-27.js",
  "./fantacalcio.webmanifest",
  "./fantacalcio-icons/icon-192.png",
  "./fantacalcio-icons/icon-512.png",
  "./fantacalcio-icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// pagina, script e manifest: prima la rete, così gli aggiornamenti arrivano subito
// e non capita mai di avere la pagina nuova con i dati vecchi. Le immagini restano
// prese dalla cache, tanto non cambiano.
const daRete = url => /\.(html|js|webmanifest|json)$/.test(url.pathname) || url.pathname.endsWith("/");

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || daRete(url)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./fantacalcio.html" : req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req.mode === "navigate" ? "./fantacalcio.html" : req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return res;
    }))
  );
});
