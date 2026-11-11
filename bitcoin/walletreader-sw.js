/* Service worker delle pagine Bitcoin: tiene in cache il guscio dell'app. */
const CACHE = "walletreader-v2";
const ASSETS = [
  "./index.html",
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
const daRete = url => /\.(html|webmanifest|js)$/.test(url.pathname) || url.pathname.endsWith("/");

// Lo scope è tutta la cartella /bitcoin/, che ora ha due pagine: il fallback
// offline deve rendere quella chiesta, non sempre il lettore di wallet.
const paginaDi = req => new URL(req.url).pathname.endsWith("/walletreader.html")
  ? "./walletreader.html"
  : "./index.html";

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
            caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? paginaDi(req) : req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req.mode === "navigate" ? paginaDi(req) : req))
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
