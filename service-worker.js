// Service Worker — permite instalar o app no celular e funcionar offline
// Analogia: é como um assistente que fica em segundo plano no celular,
// guardando os arquivos do app para funcionar mesmo sem internet

// versão incrementada para forçar o browser a baixar o novo index.html
const CACHE_NAME = 'cleaner-v2';

// arquivos que serão salvos no celular na primeira visita
const ARQUIVOS_PARA_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// quando o app é instalado no celular pela primeira vez
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARQUIVOS_PARA_CACHE);
    })
  );
});

// quando o celular faz uma requisição — tenta usar cache, se não tiver vai na rede
self.addEventListener('fetch', function(event) {
  // chamadas para a API (/receipts, /invoices, etc.) NUNCA usam cache
  // sempre vão direto para o servidor
  if (event.request.url.includes('/receipts') ||
      event.request.url.includes('/quotes') ||
      event.request.url.includes('/invoices') ||
      event.request.url.includes('/emitters') ||
      event.request.url.includes('/clients') ||
      event.request.url.includes('/employees')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // para os arquivos estáticos (HTML, CSS, JS), usa cache primeiro
  event.respondWith(
    caches.match(event.request).then(function(resposta) {
      // se achou no cache, retorna do cache
      if (resposta) return resposta;
      // se não achou, busca na rede e salva no cache para próxima vez
      return fetch(event.request).then(function(respostaRede) {
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, respostaRede.clone());
          return respostaRede;
        });
      });
    })
  );
});

// quando uma versão nova do app é publicada, limpa o cache antigo
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(nomes) {
      return Promise.all(
        nomes.filter(function(nome) {
          return nome !== CACHE_NAME;
        }).map(function(nome) {
          return caches.delete(nome);
        })
      );
    })
  );
});

