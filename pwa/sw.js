// Service worker: przechowuje aplikację w telefonie, żeby działała offline.
// VERSION podmienia workflow przy publikacji; nowa wersja = nowa nazwa pamięci podręcznej.
const VERSION = "__VERSION__";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const CACHE = `fbw-emom-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  // Usuwamy poprzednie wersje, żeby nie zajmowały miejsca w telefonie.
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fbw-emom-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Czcionki Google: z sieci, a kopia zostaje na wypadek braku internetu.
  if (url.origin !== self.location.origin) {
    if (!/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Strona: najpierw sieć (świeża wersja), bez internetu — kopia z telefonu.
  event.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put(req, copy)); }
    return res;
  }).catch(async () => (await caches.match(req, { ignoreSearch: true }))
    || (req.mode === "navigate" ? caches.match("./") : undefined)));
});
