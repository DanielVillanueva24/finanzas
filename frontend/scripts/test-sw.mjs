/**
 * Prueba el service worker contra fallos de red y de cache.
 * El handler de navegacion SIEMPRE debe resolver a una Response: devolver
 * undefined rompe la navegacion con "Failed to convert value to 'Response'".
 *
 * Uso: npm run test:sw
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(process.argv[2] || 'public/sw.js', 'utf8')

function makeScope({ cacheEmpty, networkFails, cachesThrow }) {
  const handlers = {}
  const cacheStub = {
    add: async () => { if (networkFails) throw new Error('offline') },
    match: async () => (cacheEmpty ? undefined : new Response('desde cache')),
    put: async () => {},
  }
  const scope = {
    Response, URL, console,
    location: { origin: 'https://finanzas-web-p6ol.onrender.com' },
    caches: {
      open: async () => { if (cachesThrow) throw new Error('sin storage'); return cacheStub },
      keys: async () => [],
      delete: async () => true,
      match: async () => (cacheEmpty ? undefined : new Response('desde cache')),
    },
    fetch: async () => { if (networkFails) throw new Error('offline'); return new Response('ok') },
  }
  scope.self = scope
  scope.addEventListener = (type, fn) => { handlers[type] = fn }
  vm.createContext(scope)
  vm.runInContext(code, scope)
  return handlers
}

async function navigate(opts) {
  const handlers = makeScope(opts)
  let captured
  handlers.fetch({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://finanzas-web-p6ol.onrender.com/registro',
      clone() { return this },
    },
    respondWith: (p) => { captured = p },
  })
  return captured === undefined ? 'NO respondio' : await captured
}

const casos = [
  ['red caida + cache VACIO (el caso del bug)', { cacheEmpty: true, networkFails: true }],
  ['red caida + cache con contenido',           { cacheEmpty: false, networkFails: true }],
  ['storage inaccesible + red caida',           { cacheEmpty: true, networkFails: true, cachesThrow: true }],
  ['todo normal',                               { cacheEmpty: false, networkFails: false }],
]

let fallos = 0
for (const [nombre, opts] of casos) {
  let r
  try { r = await navigate(opts) } catch (e) { r = 'EXCEPCION: ' + e.message }
  const ok = r instanceof Response
  if (!ok) fallos++
  const detalle = ok ? 'Response ' + r.status : String(r)
  console.log((ok ? '  OK  ' : ' FALLA') + ' | ' + nombre.padEnd(42) + ' -> ' + detalle)
}
console.log(fallos === 0 ? '\nTodos los casos devuelven una Response valida.' : '\n' + fallos + ' casos fallan')
process.exit(fallos === 0 ? 0 : 1)
