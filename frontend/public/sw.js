const CACHE = 'zapvio-v1'

self.addEventListener('install', () => {
  // Sem pre-cache: app autenticado, páginas dependem de sessão
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Só intercepta requisições do mesmo domínio
  if (url.origin !== self.location.origin) return

  // Nunca intercepta API nem rotas internas do Next.js de dados
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // Assets estáticos do Next.js → cache first (imutáveis pelo hash no nome)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
          }
          return response
        })
      })
    )
    return
  }

  // Páginas e outros recursos → network first, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
