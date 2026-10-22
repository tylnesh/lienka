// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

/* babylog service worker — network first (live data, fresh code), cache only as a fallback
   for the shell when the network is down. Served by the app at /sw.js so it can own "/". */
const VERSION = "babylog-v45";
const SHELL = ["/", "/static/index.html", "/static/app.js", "/static/style.css", "/static/icon.svg",
               "/static/icon-192.png", "/static/icon-512.png", "/static/apple-touch-icon.png",
               "/static/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;  // API calls always hit the server

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (SHELL.includes(url.pathname)) {
        const cache = await caches.open(VERSION);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await caches.match("/");
        if (shell) return shell;
      }
      return new Response("offline", { status: 504, statusText: "offline" });
    }
  })());
});
