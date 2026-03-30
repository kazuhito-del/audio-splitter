/* coi-serviceworker - enables SharedArrayBuffer on GitHub Pages
   Based on https://github.com/gzuidhof/coi-serviceworker (MIT License)

   This service worker adds Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy,
   and Cross-Origin-Resource-Policy headers to all responses, enabling SharedArrayBuffer
   which is required by FFmpeg.wasm.
*/

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", function (event) {
  const request = event.request;

  // only-if-cached requests must be same-origin; skip others
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  event.respondWith(
    fetch(request).then(function (response) {
      // Already properly isolated → pass through as-is
      if (
        response.headers.get("cross-origin-opener-policy") === "same-origin" &&
        (response.headers.get("cross-origin-embedder-policy") === "require-corp" ||
          response.headers.get("cross-origin-embedder-policy") === "credentialless")
      ) {
        return response;
      }

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
      // "credentialless" allows cross-origin CDN resources without CORP (Chrome/Firefox/Safari17+)
      newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
      // Add CORP so the resource can be loaded even under require-corp COEP (iOS Safari 15/16)
      newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch(function () {
      // Network error: fall back to normal fetch (no header injection)
      return fetch(request);
    })
  );
});
