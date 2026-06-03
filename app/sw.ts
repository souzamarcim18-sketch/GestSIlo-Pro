import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkFirst, RangeRequestsPlugin, Serwist, StaleWhileRevalidate } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
  runtimeCaching: [
    // Fontes Google (CacheFirst — não muda, pode ficar 1 ano)
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    // Fontes locais (eot/otf/ttf/woff/woff2)
    {
      matcher: /\.(?:eot|otf|ttf|woff|woff2)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    // Imagens locais
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Next.js Image Optimization
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Áudio (com suporte a range requests para streaming)
    {
      matcher: /\.(?:mp3|wav|ogg)$/i,
      handler: new CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new RangeRequestsPlugin(),
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    // Vídeo
    {
      matcher: /\.(?:mp4)$/i,
      handler: new CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new RangeRequestsPlugin(),
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    // JS estático
    {
      matcher: /\.(?:js)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // CSS
    {
      matcher: /\.(?:css|less)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Next.js data (ISR/SSG)
    {
      matcher: /\/_next\/data\/.+\/.+\.json$/i,
      handler: new StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // JSON/XML/CSV estáticos
    {
      matcher: /\.(?:json|xml|csv)$/i,
      handler: new NetworkFirst({
        cacheName: 'static-data-assets',
        networkTimeoutSeconds: 10,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // APIs — EXCLUINDO /api/auth/* (segurança: tokens nunca em cache)
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
      handler: new NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Rotas internas do app (páginas Next.js estáticas/públicas)
    // Excluídas do cache:
    // - /dashboard, /operador: middleware emite redirects → "no-response" com navigationPreload
    // - /login: idem
    // - /solicitar-acesso, /forgot-password, /register: Server Actions usam POST para a
    //   mesma URL da página; cachear essas rotas impede o submit do formulário ("no-response")
    // - /gestsilo-admin: autenticação própria via JWT cookie; não cachear para evitar
    //   conflitos com o middleware do painel interno
    // Regra adicional: requisições POST nunca são cacheadas (Server Actions)
    {
      matcher: ({ url, request }) =>
        url.origin === self.location.origin &&
        request.method !== 'POST' &&
        !url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/dashboard') &&
        !url.pathname.startsWith('/operador') &&
        !url.pathname.startsWith('/gestsilo-admin') &&
        url.pathname !== '/login' &&
        url.pathname !== '/solicitar-acesso' &&
        url.pathname !== '/forgot-password' &&
        url.pathname !== '/register',
      handler: new NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    // Cross-origin (recursos externos não cobertos acima)
    {
      matcher: ({ url }) => url.origin !== self.location.origin,
      handler: new NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 })],
      }),
    },
  ],
});

serwist.addEventListeners();
