/* Perfect Body service worker: app shell cache-first, fonts stale-while-revalidate */
var VERSION = "perfectbody-v1.1";
var SHELL = ["./", "index.html", "three.min.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    // network-first for the page so updates arrive; fall back to cache offline
    if (req.mode === "navigate") {
      e.respondWith(fetch(req).then(function (res) {
        var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put("index.html", copy); }); return res;
      }).catch(function () { return caches.match("index.html"); }));
      return;
    }
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    return;
  }
  if (url.hostname.indexOf("fonts.googleapis.com") >= 0 || url.hostname.indexOf("fonts.gstatic.com") >= 0) {
    e.respondWith(caches.open(VERSION + "-fonts").then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
