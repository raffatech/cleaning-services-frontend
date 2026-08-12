// Service Worker — permite instalar o app no celular e funcionar offline
// Analogia: é como um assistente que fica em segundo plano no celular,
// guardando os arquivos do app para funcionar mesmo sem internet

// versão incrementada para forçar o browser a baixar o novo index.html
const CACHE_NAME = 'cleaner-v4';

const ARQUIVOS_PARA_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/script.js',
  '/manifest.json',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// INSTALL: Pré-cacheia arquivos para garantir sincronização HTML+CSS+JS
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARQUIVOS_PARA_CACHE);
    })
  );
});

// FETCH: Estratégia diferenciada por tipo de arquivo
self.addEventListener('fetch', function(event) {
  // API: NUNCA usa cache (sempre fresco)
  if (event.request.url.includes('/receipts') ||
      event.request.url.includes('/quotes') ||
      event.request.url.includes('/invoices') ||
      event.request.url.includes('/emitters') ||
      event.request.url.includes('/clients') ||
      event.request.url.includes('/employees')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // HTML: Tenta rede primeiro, cai no cache se offline
  if (event.request.url.includes('/index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(resposta) {
          // Se sucesso: cacheIa a nova versão
          if (resposta && resposta.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, resposta.clone());
            });
          }
          return resposta;
        })
        .catch(function() {
          // Se offline: retorna do cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // CSS, JS, Imagens: Cache primeiro (rápido, confiável)
  event.respondWith(
    caches.match(event.request)
      .then(function(resposta) {
        if (resposta) return resposta;
        return fetch(event.request)
          .then(function(respostaRede) {
            return caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, respostaRede.clone());
              return respostaRede;
            });
          });
      })
  );
});

// ACTIVATE: Deleta caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(nomes) {
      return Promise.all(
        nomes
          .filter(function(nome) {
            return nome !== CACHE_NAME;
          })
          .map(function(nome) {
            return caches.delete(nome);
          })
      );
    })
  );
});