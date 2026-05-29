# PRD — Migração next-pwa → Serwist

## Estado Atual (levantamento T-PWA.0 — 2026-05-29)

### Configuração next-pwa (`next.config.ts`)

```ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
```

- **`dest: 'public'`** — SW gerado em `public/sw.js` e `public/workbox-*.js`
- **`register: true`** — next-pwa injeta o registro do SW automaticamente (sem código explícito no app)
- **`skipWaiting: true`** — ativa o novo SW imediatamente sem esperar abas fecharem
- **`disable: dev`** — SW desabilitado em desenvolvimento (correto)
- **Nenhum `runtimeCaching` customizado** — apenas as rotas padrão do next-pwa

### Pacote instalado

```
next-pwa: ^5.6.0  (dependencies)
```

### Arquivos gerados (em `public/`)

| Arquivo | Descrição |
|---|---|
| `sw.js` | Service Worker compilado (gerado pelo next-pwa no build) |
| `sw.js.map` | Source map do SW |
| `workbox-4754cb34.js` | Runtime Workbox (gerado pelo next-pwa no build) |
| `workbox-4754cb34.js.map` | Source map do Workbox |

### Manifest (`public/manifest.json`)

```json
{
  "name": "GestSilo",
  "short_name": "GestSilo",
  "description": "Gestão integrada de silagem e pecuária para produtores rurais",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#161616",
  "theme_color": "#00843D",
  "categories": ["productivity", "business"],
  "lang": "pt-BR",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker customizado?

**Não.** O `public/sw.js` é 100% gerado pelo next-pwa a cada build. Não há nenhum arquivo de SW customizado no repositório (`app/sw.ts`, `public/sw-custom.js`, etc.).

### Registro do SW

O registro é feito **automaticamente** pelo next-pwa via `register: true`. Não há chamada a `navigator.serviceWorker.register()` em nenhum arquivo do app. O `public/sw.js` chama `self.skipWaiting()` diretamente.

---

## Assets Precachados (extraídos do `public/sw.js`)

O `precacheAndRoute` inclui:

- Todos os chunks JS/CSS do `/_next/static/` (100+ arquivos com hash de conteúdo)
- Fontes locais: `Satoshi-Variable.ttf`, `Satoshi-VariableItalic.ttf`
- Assets de `public/`: `icon-192.png`, `icon-512.png`, `logo.png`, `logo_verde.png`, `logo_degrad-hor.png`, `imagem-hero.png`, `imagem-hero.webp`, `manifest.json`, `Icon fav.png`
- Arquivos de manifesto do Next.js: `app-build-manifest.json`, `_buildManifest.js`, `_ssgManifest.js`

---

## Estratégias de Cache Configuradas

| Rota/Padrão | Estratégia | Cache Name | TTL / Max Entries |
|---|---|---|---|
| `/` (start URL) | **NetworkFirst** | `start-url` | — |
| Fontes Google Fonts (gstatic) | **CacheFirst** | `google-fonts-webfonts` | 1 ano, 4 entries |
| Fontes Google Fonts (googleapis) | **StaleWhileRevalidate** | `google-fonts-stylesheets` | 7 dias, 4 entries |
| `*.eot/otf/ttf/woff/woff2` | **StaleWhileRevalidate** | `static-font-assets` | 7 dias, 4 entries |
| `*.jpg/jpeg/gif/png/svg/ico/webp` | **StaleWhileRevalidate** | `static-image-assets` | 1 dia, 64 entries |
| `/_next/image?url=...` | **StaleWhileRevalidate** | `next-image` | 1 dia, 64 entries |
| `*.mp3/wav/ogg` | **CacheFirst** + RangeRequests | `static-audio-assets` | 1 dia, 32 entries |
| `*.mp4` | **CacheFirst** + RangeRequests | `static-video-assets` | 1 dia, 32 entries |
| `*.js` | **StaleWhileRevalidate** | `static-js-assets` | 1 dia, 32 entries |
| `*.css/less` | **StaleWhileRevalidate** | `static-style-assets` | 1 dia, 32 entries |
| `/_next/data/.+/.json` | **StaleWhileRevalidate** | `next-data` | 1 dia, 32 entries |
| `*.json/xml/csv` | **NetworkFirst** | `static-data-assets` | 1 dia, 32 entries |
| `/api/*` (exceto `/api/auth/*`) | **NetworkFirst** | `apis` | timeout 10s, 1 dia, 16 entries |
| Rotas próprias (não `/api/*`) | **NetworkFirst** | `others` | timeout 10s, 1 dia, 32 entries |
| Cross-origin | **NetworkFirst** | `cross-origin` | timeout 10s, 1h, 32 entries |

**Nota importante**: As rotas `/api/auth/*` são **excluídas** do cache de APIs (correto para segurança).

---

## Problemas com next-pwa 5.x

1. **Sem suporte a Next.js App Router** — next-pwa 5.x foi projetado para Pages Router; gera SW com workbox mas sem entendimento das rotas do App Router
2. **`require()` em vez de ESM** — `const withPWA = require('next-pwa')` viola a convenção ESM do projeto (`next.config.ts` usa `import`)
3. **Workbox gerado em `public/`** — arquivos `workbox-*.js` no diretório público são servidos estaticamente mas não são controlados pelo Next.js
4. **Sem SW customizado por rota** — impossível adicionar lógica offline condicional (ex: mostrar UI offline apenas em `/dashboard`, não em `/login`)
5. **Abandono do projeto** — next-pwa está sem manutenção ativa; Serwist é o fork oficial com suporte a Next.js 15 e App Router

---

## Objetivo da Migração

Substituir `next-pwa` por `@serwist/next` mantendo:
- Todas as estratégias de cache existentes (NetworkFirst, StaleWhileRevalidate, CacheFirst)
- Exclusão de `/api/auth/*` do cache
- Desabilitado em desenvolvimento
- `skipWaiting: true`
- `manifest.json` inalterado (não depende do next-pwa)

### Vantagens do Serwist

- Suporte nativo ao App Router do Next.js 15
- ESM-first — compatível com `next.config.ts` em módulo ES
- SW definido em `app/sw.ts` — versionado, testável, auditável
- Tipos TypeScript completos
- Manutenção ativa (fork do next-pwa com contribuidores ativos)

---

## Escopo da Migração

### O que muda
- `package.json`: remover `next-pwa`, adicionar `@serwist/next` e `serwist`
- `next.config.ts`: substituir `withPWA` por `withSerwist`
- Criar `app/sw.ts` — Service Worker tipado em TypeScript
- Remover `public/sw.js`, `public/sw.js.map`, `public/workbox-*.js` (gerados, não commitados idealmente)

### O que NÃO muda
- `public/manifest.json` — inalterado
- Todas as estratégias de cache — replicadas em `app/sw.ts`
- Headers de segurança em `next.config.ts`
- Integração com Sentry (`withSentryConfig`)
- Ícones e assets em `public/`

---

## Referências

- [Serwist Docs](https://serwist.pages.dev/docs/next/getting-started)
- [next-pwa GitHub](https://github.com/shadowwalker/next-pwa) (arquivado)
- [Serwist GitHub](https://github.com/serwist/serwist)
