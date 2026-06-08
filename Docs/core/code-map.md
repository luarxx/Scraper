# Code Map

Mapa completo dos principais arquivos e diretorios do projeto.

```txt
/
|-- scraper.ts              # Fachada publica do scraper + execucao CLI
|-- scraper-core/           # Core do scraper por responsabilidade
|   |-- types.ts            # Tipos Produto, SiteConfig, Resultado
|   |-- sites.ts            # Configuracoes e extratores KaBuM!, Pichau e TerabyteShop
|   |-- search.ts           # buscarProduto() e buscarProdutoPorUrl()
|   |-- productPageParser.ts # Parsing HTML de pagina de produto por URL
|   |-- cache.ts            # Normalizacao de termo e cache por SHA256
|   |-- fingerprint.ts      # Fingerprint e init script anti-deteccao
|   |-- browserBehavior.ts  # Waits, mouse/scroll e deteccao de challenge
|   `-- cli.ts              # Parser de argumentos e saida de terminal
|-- server.ts               # Fachada publica do servidor + startServer()
|-- server-core/            # Servidor por responsabilidade
|   |-- env.ts              # Env, ROOT, portas e caminhos
|   |-- db.ts               # SQLite e initDatabase()
|   |-- time.ts             # Datas America/Sao_Paulo e agendamento por grade
|   |-- money.ts            # Conversoes BRL/centavos
|   |-- http.ts             # JSON/static/SPA fallback
|   |-- priceHistory.ts     # Persistencia de historico de precos
|   |-- auto.ts             # Scheduler e execucao de busca automatica
|   |-- watch.ts            # Scheduler Watch, alertas e Discord
|   `-- routes/             # Handlers HTTP por contexto
|-- AGENTS.md               # Instrucoes curtas e roteamento para agentes
|-- Docs/                   # Documentacao detalhada por tema
|-- DESIGN.md               # Documentacao do design system e UI/UX
|-- DEPLOY_ORACLE_VPS.md    # Guia de deploy na Oracle VPS com FileZilla, Nginx e PM2
|-- DEPLOY_GITHUB_ACTIONS.md # Guia do deploy automatico via GitHub Actions
|-- COMANDOS_VPS.md         # Comandos operacionais para administrar a VPS
|-- ATUALIZAR_SITE_VPS.md   # Fluxo curto para atualizar a VPS apos mudancas locais
|-- .env                    # Configuracao local/producao
|-- .env.example            # Exemplo das variaveis de ambiente
|-- opencode.json           # Config do opencode, default agent: scraper
|-- tsconfig.json           # TS config root, CommonJS
|-- scripts/                # Scripts operacionais manuais, ex.: teste de webhook Discord
|-- package.json            # Scripts root
|-- tests/                  # Testes backend/root
|   |-- scraper.test.ts
|   |-- server.test.ts
|   |-- fixtures/           # HTML/API samples mockados
|   `-- helpers/            # Helpers compartilhados de teste, SQLite temp e mocks
|-- client/                 # Frontend React, sub-projeto ESM
|   |-- index.html
|   |-- public/
|   |   `-- Logo.png        # Asset publico da logo e favicon
|   |-- vite.config.ts      # Proxy /api -> localhost:3000 ou API_PORT/PORT
|   |-- package.json        # React 19, Vite 8, Tailwind 4
|   |-- tsconfig.json       # Project references
|   |-- src/
|   |   |-- main.tsx
|   |   |-- App.tsx         # Layout + state machine + toggle Manual/Auto/Watch
|   |   |-- index.css       # Tailwind + custom CSS
|   |   |-- types.ts        # Shared types
|   |   |-- hooks/
|   |   |   |-- useSearch.ts
|   |   |   |-- useSearchHistory.ts
|   |   |   |-- useAutoConfig.ts
|   |   |   |-- useAutoResults.ts
|   |   |   `-- useWatchAlerts.ts
|   |   `-- components/
|   |       |-- SearchForm.tsx
|   |       |-- Logo.tsx
|   |       |-- SearchHistory.tsx
|   |       |-- ProductGrid.tsx
|   |       |-- ProductCard.tsx
|   |       |-- StateMessage.tsx
|   |       |-- PriceHistoryChart.tsx
|   |       |-- AutoSearchPanel.tsx
|   |       |-- AutoConfigList.tsx
|   |       |-- AutoResultsView.tsx
|   |       `-- WatchPanel.tsx
|   `-- dist/               # Build output servido em producao
|-- data/
|   |-- scraper.db          # SQLite: auto_config, auto_execucoes, auto_resultados
|   |-- prices.db           # Legacy: historico de precos
|   |-- resultado.json      # Ultimo resultado do scraper CLI
|   |-- resultado.js        # Mesmo resultado, formato window.__RESULT
|   `-- cache/              # Cache de resultados SHA256, TTL 10min
`-- .opencode/              # Config do opencode
```

## Frontend Components

```txt
App
|-- SearchForm          # Input + site tabs + submit button
|-- SearchHistory       # "Ultimas buscas" pills, localStorage
|-- StateMessage        # initial | loading | empty | error
|-- ProductGrid
|   `-- ProductCard[]   # Imagem, preco, alerta e loja
|-- AutoSearchPanel
|   |-- AutoConfigList  # Ate 10 produtos configurados, add/remove/reorder
|   `-- AutoResultsView # Ultima execucao por termo com ProductGrid
`-- WatchPanel          # Status + formulario + lista de alertas
```

## Hooks

- `useSearch`: estado de busca, `search(q, siteKey)` e `fetchSites()`.
- `useSearchHistory`: ultimas 5 buscas no `localStorage`, sem duplicatas.
- `useAutoConfig`: CRUD da configuracao automatica, `fetchConfig()`, `saveConfig(entries)`, `removeConfig(id)`, `fetchStatus()`.
- `useAutoResults`: resultados automaticos, `fetchResults()` e `triggerRun()`.
- `useWatchAlerts`: alertas Watch, `fetchAlerts()`, `fetchStatus()`, `createAlert(input)`, `removeAlert(id)`, `triggerRun()`.
