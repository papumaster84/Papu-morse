/* PapuMorse — service worker mínimo: cachea la app (index.html) y sus
   archivos PWA para poder abrirla sin conexión. Vive en la RAÍZ, junto a
   index.html, para que su alcance (scope) cubra toda la app: un service
   worker solo puede controlar páginas dentro de su propia carpeta, y
   desde assets/ nunca podría controlar index.html. Estrategia
   cache-first para peticiones GET del mismo origen; lo que se pide con
   red y sale bien se guarda en caché para la próxima vez. */
var CACHE = "papumorse-v2";
var APP_SHELL = [
  "./",
  "./index.html",
  "assets/manifest.webmanifest",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      /* Cada URL por separado: si una falla, las demás sí quedan cacheadas. */
      return Promise.all(APP_SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(event.request).then(function (res) {
        if (res && res.ok && new URL(event.request.url).origin === self.location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      }).catch(function () {
        /* Sin red y sin caché: para navegaciones, la portada cacheada. */
        if (event.request.mode === "navigate") return caches.match("./index.html", { ignoreSearch: true });
      });
    })
  );
});
