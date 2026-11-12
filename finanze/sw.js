/* Service worker di Finanze personali: tiene in cache il guscio dell'app. */
const CACHE = "finanze-v1";
const ASSETS = [
  "./index.html",
  "./finanze.webmanifest",
  "./icone/icon-192.png",
  "./icone/icon-512.png",
  "./icone/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// pagina e manifest: prima la rete, così un aggiornamento arriva subito; senza
// linea si ripiega sulla copia in cache. Le icone restano prese dalla cache.
// I saldi stanno in localStorage e non passano di qui; blockchain e prezzi sono
// su altri domini e devono restare freschi.
const daRete = url => /\.(html|webmanifest|js)$/.test(url.pathname) || url.pathname.endsWith("/");

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
            caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req))
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
