/* Service worker dell'app Asta Fantacalcio: tiene tutto offline. */
const CACHE = "asta-fantacalcio-v4";
const ASSETS = [
  "./fantacalcio.html",
  "./listone.js",
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

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // navigazione: prima la rete (per avere gli aggiornamenti), poi la copia salvata
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./fantacalcio.html", copy));
          return res;
        })
        .catch(() => caches.match("./fantacalcio.html"))
    );
    return;
  }

  // resto: risposta dalla cache e aggiornamento in sottofondo
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
