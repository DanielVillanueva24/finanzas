/* Service worker de Finanzas: cache basico del shell + pantalla offline. */
const VERSION = 'finanzas-v2'
const SHELL_CACHE = VERSION + '-shell'
const ASSET_CACHE = VERSION + '-assets'

const SHELL_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon-180.png',
]

// Ultimo recurso: si el cache quedo vacio, seguimos devolviendo una Response
// valida. Devolver undefined rompe la navegacion con "Failed to convert value
// to 'Response'".
const FALLBACK_HTML =
  '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Sin conexion</title></head><body style="margin:0;min-height:100vh;display:grid;' +
  'place-items:center;font-family:system-ui,sans-serif;background:#F8F9FA;color:#212529">' +
  '<div style="text-align:center;padding:24px"><h1 style="font-size:20px">Sin conexion</h1>' +
  '<p style="color:#8D99AE;font-size:14px">Revisa tu conexion y vuelve a intentarlo.</p>' +
  '<button onclick="location.reload()" style="margin-top:16px;border:0;padding:12px 20px;' +
  'border-radius:10px;background:#4361EE;color:#fff;font-size:15px;font-weight:600;' +
  'cursor:pointer">Reintentar</button></div></body></html>'

function offlineResponse() {
  return new Response(FALLBACK_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Uno por uno: si un archivo falla, los demas si quedan cacheados.
      // Con addAll un solo 404 dejaba el cache completamente vacio.
      .then((cache) =>
        Promise.all(SHELL_FILES.map((file) => cache.add(file).catch(() => undefined))),
      )
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Las llamadas a la API nunca se cachean: siempre datos frescos.
  if (url.origin !== self.location.origin) return

  // Navegacion: red primero, si falla mostramos el shell o la pantalla offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches
            .open(SHELL_CACHE)
            .then((cache) => cache.put('/index.html', copy))
            .catch(() => undefined)
          return response
        })
        .catch(async () => {
          try {
            const cache = await caches.open(SHELL_CACHE)
            const cached =
              (await cache.match('/index.html')) ||
              (await cache.match('/')) ||
              (await cache.match('/offline.html'))
            if (cached) return cached
          } catch {
            // el cache no esta disponible, caemos al HTML de respaldo
          }
          return offlineResponse()
        }),
    )
    return
  }

  // Estaticos: cache primero y refresco en segundo plano.
  event.respondWith(
    caches
      .match(request)
      .catch(() => undefined)
      .then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const copy = response.clone()
              caches
                .open(ASSET_CACHE)
                .then((cache) => cache.put(request, copy))
                .catch(() => undefined)
            }
            return response
          })
          .catch(() => cached)
        // Si no hay cache ni red, devolvemos un error manejable en vez de undefined.
        return cached || network.then((r) => r || Response.error())
      }),
  )
})
