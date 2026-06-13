# AGENTS.md - Project Instructions

## Project

Scraper e um web scraper de e-commerces brasileiros de informatica. Busca produtos em lojas como KaBuM!, Pichau e TerabyteShop, extrai titulo, preco, parcelamento, imagem e URL, e exibe resultados em uma interface React.

Stack principal: Node.js + TypeScript, Playwright, SQLite, servidor HTTP nativo, React + Vite + Tailwind e Vitest.

Root usa CommonJS. `client/` usa ESM.

Nao adicionar Express, Fastify ou outro framework HTTP.

---

## Context Economy

Antes de abrir arquivos grandes, use `rg` para localizar simbolos, rotas, hooks, componentes ou testes relevantes.

Leia apenas os arquivos necessarios para a tarefa atual.

Nao investigar `data/`, `dist/`, `client/dist/`, `node_modules/` ou caches, salvo se a tarefa envolver build, persistencia ou artefatos gerados.

Nao abrir documentacao de deploy/VPS salvo quando a tarefa envolver producao, deploy, PM2, Nginx, VPS ou GitHub Actions.

Leia `DESIGN.md` apenas para tarefas de UI/UX, layout, copy visual, cores, animacoes, responsividade ou acessibilidade.

---

## Code Map

- `scraper.ts`: fachada publica do scraper e modo CLI.
- `scraper-core/`: logica do scraper, sites, busca, cache, fingerprint, parsing e comportamento de browser.
- `server.ts`: fachada publica do servidor e start.
- `server-core/`: servidor HTTP, env, SQLite, rotas, schedulers Auto/Watch e utilitarios.
- `server-core/enabledSites.ts`: filtro de sites habilitados com base em `DISABLED_SITES`.
- `server-core/routes/`: handlers HTTP por dominio.
- `client/src/`: frontend React.
- `client/src/hooks/`: hooks de busca, historico, Auto e Watch.
- `client/src/components/`: componentes visuais.
- `tests/`: testes backend/root.
- `client/src/**/*.test.ts(x)`: testes frontend.

Para mapa completo, leia `Docs/core/code-map.md`.

---

## Scope Routing

Backend/API:
- Priorize `server-core/`, `server.ts` e testes relacionados em `tests/`.
- Nao abrir `client/` sem necessidade.

Frontend:
- Priorize `client/src/App.tsx`, componente/hook afetado e `client/src/types.ts` quando necessario.
- Leia `DESIGN.md` apenas para mudancas visuais ou UX.

Scraper:
- Para site especifico, priorize `scraper-core/sites.ts`, helpers em `scraper-core/` e fixtures/testes correspondentes.
- Leia `Docs/scraper/strategy.md` antes de alterar scraping.

Docs:
- Atualize apenas Markdown e nao rode build/testes salvo pedido explicito.

---

## Documentation Routing

Leia documentacao extra apenas quando a tarefa exigir:

- Arquitetura geral: `Docs/core/architecture.md`
- Mapa completo de arquivos: `Docs/core/code-map.md`
- Convencoes: `Docs/core/conventions.md`
- Validacao/testes: `Docs/core/validation.md`
- Endpoints HTTP: `Docs/api/endpoints.md`
- Busca manual: `Docs/features/manual-search.md`
- Auto Search: `Docs/features/auto-search.md`
- Watch Alerts: `Docs/features/watch-alerts.md`
- Estrategia de scraping: `Docs/scraper/strategy.md`
- Anti-deteccao/Cloudflare: `Docs/scraper/anti-detection.md`
- Plano de acao anti-deteccao: `Docs/scraper/anti-detection-action-plan.md`
- Comandos operacionais: `Docs/operations/commands.md`
- Deploy/VPS/GitHub Actions: `Docs/operations/deploy.md`
- UI/UX/design system: `DESIGN.md`

---

## Feature Routing

Para busca manual:
- Backend: `/api/search`, `scraper-core/search.ts`, `server-core/routes/search*`.
- Frontend: `useSearch`, `SearchForm`, `SearchHistory`, `StateMessage`, `ProductGrid`, `ProductCard`.
- Leia `Docs/features/manual-search.md` se precisar de mais contexto.

Para Auto Search:
- Backend: `server-core/auto.ts`, rotas `/api/auto/*`, SQLite.
- Frontend: `AutoSearchPanel`, `AutoConfigList`, `AutoResultsView`, `useAutoConfig`, `useAutoResults`.
- Regra: Auto Search salva resultados e historico, mas nao envia Discord.
- Leia `Docs/features/auto-search.md` se a tarefa envolver Auto.

Para DOM Inspector:
- Frontend: `DomInspector`, renderizado em `App.tsx`.
- Ferramenta dev frontend pura, sem backend.
- Leia `Docs/features/dom-inspector.md` se precisar de mais contexto.

Para Watch Alerts:
- Backend: `server-core/watch.ts`, rotas `/api/watch/*`, `buscarProdutoPorUrl`.
- Frontend: `WatchPanel`, `useWatchAlerts`, botao "Criar alerta" em `ProductCard`.
- Regra: Watch monitora URL especifica e envia Discord quando preco atual <= preco-alvo.
- Leia `Docs/features/watch-alerts.md` se a tarefa envolver Watch.

Para novos sites:
- Editar `scraper-core/sites.ts`.
- Seguir `SiteConfig`.
- DOM scraping usa `extrairProdutos`.
- API scraping usa `extrairProdutosViaApi`.
- Atualizar cores/badges no frontend quando necessario.
- Leia `Docs/scraper/strategy.md` antes de alterar scraping.

---

## Critical Rules

- TypeScript strict.
- Preferir exports nomeados.
- Portugues para nomes de dominio: `Produto`, `buscarProduto`, `SiteConfig`, `termo`, `preco`.
- Ingles para codigo generico.
- Nao usar comentarios em linha no codigo-fonte salvo real necessidade.
- `scraper.ts` mantem dual-mode: CLI quando executado diretamente e exports publicos como modulo.
- `server.ts` mantem servidor HTTP nativo.
- Playwright headless por padrao (`HEADLESS = true`); ajustar apenas para debug.
- Horarios devem usar `America/Sao_Paulo`.
- Auto/Watch tem intervalo minimo de 3h.
- Auto Search usa `AUTO_INTERVAL_HOURS`; valores abaixo de 3 sao elevados para 3.
- Auto Search usa `AUTO_MAX_CONCURRENCY`; default 3, minimo 1 e maximo 10.
- Alertas Discord pertencem ao Watch; Auto Search nao envia notificacoes.
- Usar soft delete/status em vez de remover fisicamente configs e alertas.
- Resultados automaticos ficam como JSON text no SQLite, coluna `produtos`.
- Auto Search executa buscas com concorrencia limitada e recupera crash quando ultima execucao ficou `executando`.
- Logs operacionais devem usar prefixo curto, por exemplo `[Busca Manual]`, `[Busca Automatica]`, `[Watch]`.
- `DISABLED_SITES` na env desativa sites nas rotas e schedulers sem afetar o scraper core. `server-core/enabledSites.ts` exporta `isSiteEnabled()`, `getEnabledSites()` e `getEnabledSiteKeys()`.
- O frontend usa a lista de sites vinda de `/api/sites`; se KaBuM! estiver desabilitado, ela simplesmente nao aparece como opcao.
- Historico e dados antigos de sites desabilitados permanecem no banco, mas novas execucoes e acoes ficam bloqueadas.
- Server-side SQLite usa `better-sqlite3`, `db.prepare()` e transacoes com `db.transaction()`.
- Documentacao viva: atualize `AGENTS.md` e/ou `Docs/` quando mudar funcionalidades, sites, comandos, arquitetura ou convencoes.

---

## Testing and Validation

Rode validacoes proporcionais ao escopo.

Backend/root:
- `npm run typecheck`
- `npm test` quando alterar scraper, servidor, SQLite, rotas ou schedulers.

Frontend:
- `cd client && npm test` quando alterar hooks/componentes testados.
- `cd client && npm run build` apos qualquer mudanca em `client/`.

Producao/deploy:
- `npm run build:prod`.

Docs-only:
- Nao rodar build/testes salvo se solicitado.

Testes de scraper/servidor nao devem acessar lojas reais nem tocar `data/scraper.db`. Use SQLite temporario via `SCRAPER_DB_PATH` e mocks de `buscarProduto()`/`buscarProdutoPorUrl()`.

---

## Response Rules

Antes de editar, explique brevemente o plano.

Ao finalizar, diga:
- arquivos criados;
- arquivos alterados;
- validacoes executadas;
- qualquer validacao nao executada e o motivo.

Nao colar grandes trechos de codigo na resposta final. Cite arquivos e resuma o que mudou.
