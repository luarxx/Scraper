# Architecture

Scraper e um web scraper de e-commerces brasileiros usando Playwright. Ele busca produtos em multiplas lojas, extrai titulo, preco, parcelamento, imagem e URL, ordena por relevancia + preco e exibe resultados em uma interface React.

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript 6, CommonJS no root e ESM no client |
| Scraper | Playwright 1.60, Chromium headless por padrao |
| Servidor | Node.js `http` module puro, sem Express/Fastify |
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Dev tools | `tsx`, `concurrently` |
| Tests | Vitest root + client, jsdom, Testing Library |

## High-Level Flow

```txt
Browser (React SPA)
     |  GET /api/search?q=...&site=...   |   Aba "Automatica"   |   Aba "Watch"
     v                                   v                      v
Server (server.ts - Node.js http)
     |
     |-- serve SPA from client/dist/ (production, even when running dist/server.js)
     |   `-- fallback: serve from root (legacy)
     |
     |-- /api/search -> scraper.ts:buscarProduto()
     |                  |-- KaBuM!       -> DOM scraping
     |                  |-- Pichau       -> DOM scraping
     |                  `-- TerabyteShop -> API scraping
     |
     |-- /api/auto/* -> SQLite (data/scraper.db)
     |   |-- auto_config     (ate 10 produtos)
     |   |-- auto_execucoes  (cada ciclo configurado)
     |   `-- auto_resultados (resultados por termo)
     |
     |-- /api/watch/* -> SQLite + Discord Webhook
     |   |-- watch_alerts (alertas por URL de produto)
     |   `-- watch_checks (historico de verificacoes)
     |
     |-- Scheduler (AUTO_INTERVAL_HOURS, minimo 3h; AUTO_MAX_CONCURRENCY, default 3)
     |   `-- Itera auto_config -> buscarProduto() com concorrencia limitada -> salva resultados
     |
     `-- Watch Scheduler (WATCH_INTERVAL_HOURS, minimo 3h)
         `-- Itera watch_alerts -> buscarProdutoPorUrl() -> Discord quando preco <= alvo
```

## Server Shape

`server.ts` e a fachada publica do servidor e inicializa `startServer()`. A implementacao por responsabilidade fica em `server-core/`.

O servidor usa o modulo nativo `http` do Node.js. Nao adicionar Express, Fastify ou outro framework HTTP.

## Static Serving

- Se `client/dist/index.html` existir, o servidor entra em SPA mode: serve tudo de `client/dist/` e usa fallback SPA para rotas sem extensao.
- Se `client/dist/index.html` nao existir, usa legacy mode: serve arquivos da raiz do projeto.
- Em producao, `dist/server.js` resolve caminhos persistentes a partir da raiz do projeto, nao de `dist/`.

## Frontend State

`client/src/App.tsx` controla o modo principal:

```txt
modo: 'manual' | 'auto' | 'watch'

Manual:
  initial -> search -> loading -> results | empty | error

Auto:
  AutoSearchPanel
    |-- tab 'config'  -> AutoConfigList
    `-- tab 'results' -> AutoResultsView

Watch:
  WatchPanel
    |-- status -> GET /api/watch/status
    |-- form/list -> GET/POST/DELETE/PATCH /api/watch/alerts
    `-- run -> POST /api/watch/run
```

Detalhes de design system, tema, cores, tipografia, background, animacoes, responsividade e acessibilidade ficam em `DESIGN.md`.
