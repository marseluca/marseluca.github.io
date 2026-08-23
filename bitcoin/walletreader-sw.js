/* Service worker del Saldo wallet Bitcoin: tiene in cache il guscio dell'app. */
const CACHE = "walletreader-v1";
const ASSETS = [
  "./walletreader.html",
  "./walletreader.webmanifest",
  "./walletreader-icons/icon-192.png",
  "./walletreader-icons/icon-512.png",
  "./walletreader-icons/apple-touch-icon.png"
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

// pagina e manifest: prima la rete, così un aggiornamento arriva subito; se manca
// la linea si ripiega sulla copia in cache. Le icone restano prese dalla cache.
// I dati di blockchain e prezzi sono su altri domini: non passano di qui, devono
// sempre essere freschi.
const daRete = url => /\.(html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");

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
            caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./walletreader.html" : req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req.mode === "navigate" ? "./walletreader.html" : req))
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
