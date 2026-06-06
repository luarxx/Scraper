# Project-level instructions for AI agents

## Project: Scraper

Web scraper de e-commerces brasileiros usando Playwright. Busca produtos em múltiplas lojas, extrai título, preço, parcelamento, imagem e ordena por relevância + preço. Possui interface React (Vite + Tailwind) e servidor HTTP próprio (sem frameworks).

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript 6 (CommonJS no root, ESM no client) |
| Scraper | Playwright 1.60 (Chromium headless) |
| Servidor | Node.js `http` module puro (sem Express/Fastify) |
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Dev tools | `tsx` (TypeScript execution), `concurrently` |
| Tests | Vitest (root + client), jsdom, Testing Library |

---

## Architecture

```
Browser (React SPA)
     │  GET /api/search?q=...&site=...   │   ⏰ Aba "Automática"   │   🔔 Aba "Watch"
     ▼                                   ▼                         ▼
Server (server.ts — Node.js http)
     │
     ├── serve SPA from client/dist/ (production, even when running dist/server.js)
     │   └── fallback: serve from root (legacy)
     │
     ├── /api/search → scraper.ts:buscarProduto()
     │                    ├── KaBuM!      → DOM scraping
     │                    ├── Pichau      → DOM scraping
     │                    └── TerabyteShop → API scraping
     │
     ├── /api/auto/* → SQLite (data/scraper.db)
     │    ├── auto_config      (até 10 produtos)
     │    ├── auto_execucoes   (cada ciclo de 6h)
     │    └── auto_resultados  (resultados por termo)
     │
     ├── /api/watch/* → SQLite + Discord Webhook
     │    ├── watch_alerts     (alertas por URL de produto)
     │    └── watch_checks     (histórico de verificações)
     │
     └── Scheduler (configurável via AUTO_INTERVAL_HOURS, mínimo 3h)
          └── Itera auto_config → buscarProduto() sequencial → salva resultados
     └── Watch Scheduler (WATCH_INTERVAL_HOURS, mínimo 3h)
          └── Itera watch_alerts → buscarProdutoPorUrl() → dispara Discord quando preço ≤ alvo
```

---

## Code Organization

```
/
├── scraper.ts          # Core: tipos, config dos sites, busca por termo/URL, lógica de scraping, CLI
├── server.ts           # HTTP server: API endpoints + static + SQLite DB + schedulers
├── AGENTS.md           # ← este arquivo
├── DESIGN.md           # Documentação do design system e UI/UX
├── DEPLOY_ORACLE_VPS.md # Guia de deploy na Oracle VPS com FileZilla, Nginx e PM2
├── DEPLOY_GITHUB_ACTIONS.md # Guia do deploy automático via GitHub Actions
├── COMANDOS_VPS.md     # Comandos operacionais para administrar a VPS em produção
├── ATUALIZAR_SITE_VPS.md # Fluxo curto para atualizar a VPS após mudanças locais
├── .env                # Configuração local/produção (AUTO_INTERVAL_HOURS, WATCH_INTERVAL_HOURS, DISCORD_WEBHOOK_URL)
├── .env.example        # Exemplo das variáveis de ambiente
├── opencode.json       # Config do opencode (default agent: scraper)
├── tsconfig.json       # TS config (root, CommonJS)
├── scripts/            # Scripts operacionais manuais (ex.: teste de webhook Discord)
├── package.json        # Scripts: dev, dev:server, typecheck, build
├── tests/              # Testes backend/root do scraper, servidor, SQLite e schedulers
│   ├── scraper.test.ts
│   ├── server.test.ts
│   ├── fixtures/       # HTML/API samples mockados para testes
│   └── helpers/        # Helpers compartilhados de teste, SQLite temp e mocks
│
├── client/             # Frontend React (sub-projeto ESM)
│   ├── index.html
│   ├── public/
│   │   └── Logo.png         # Asset público da logo e favicon
│   ├── vite.config.ts  # Proxy /api → localhost:3000 ou API_PORT/PORT
│   ├── package.json    # React 19, Vite 8, Tailwind 4
│   ├── tsconfig.json   # Project references
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx           # Layout + state machine + toggle Manual/Auto/Watch
│   │   ├── index.css         # Tailwind + custom CSS
│   │   ├── types.ts          # Shared types (Produto, Site, Resultado, Auto*, PricePoint...)
│   │   ├── hooks/
│   │   │   ├── useSearch.ts         # API calls + search state
│   │   │   ├── useSearchHistory.ts  # localStorage history (max 5)
│   │   │   ├── useAutoConfig.ts     # CRUD configuração automática
│   │   │   ├── useAutoResults.ts    # Resultados execução automática
│   │   │   └── useWatchAlerts.ts    # CRUD/status/execução manual de alertas Watch
│   │   └── components/
│   │       ├── SearchForm.tsx       # Input + site tabs + submit button
│   │       ├── Logo.tsx             # Marca vetorial do Scraper usada no header
│   │       ├── SearchHistory.tsx    # Recent searches pills
│   │       ├── ProductGrid.tsx      # Grid layout + best-option logic
│   │       ├── ProductCard.tsx      # Individual product card
│   │       ├── StateMessage.tsx     # Initial/loading/empty/error states
│   │       ├── PriceHistoryChart.tsx # Gráfico de histórico de preços
│   │       ├── AutoSearchPanel.tsx  # Container da aba Automática (status + sub-abas)
│   │       ├── AutoConfigList.tsx   # Lista/reordenação de até 10 produtos configurados
│   │       ├── AutoResultsView.tsx  # Resultados da última execução automática
│   │       └── WatchPanel.tsx       # Cadastro/lista/status dos alertas de queda
│   └── dist/            # Build output (served in production)
│
├── data/
│   ├── scraper.db       # SQLite: auto_config, auto_execucoes, auto_resultados
│   ├── prices.db        # (legacy) Histórico de preços
│   ├── resultado.json   # Último resultado do scraper (CLI)
│   ├── resultado.js     # Mesmo resultado, formato `window.__RESULT`
│   └── cache/           # Cache de resultados (SHA256, TTL 10min)
│
└── .opencode/           # opencode config (plugin, etc.)
```

---

## Scraping Strategy

### `SiteConfig` interface (`scraper.ts:16-27`)

```typescript
interface SiteConfig {
  nome: string;
  urlBase: string;
  searchUrl: ((termo: string) => string) | null;
  waitStrategy: 'networkidle' | 'domcontentloaded' | 'load' | null;
  precisaHomePrimeiro: boolean;
  selectors: { productCard: string; title: string; priceContainer: string } | null;
  usaApi?: boolean;
  apiUrl?: (termo: string) => string;
  extrairProdutos?: (termo: string) => Produto[];        // DOM: executa no browser
  extrairProdutosViaApi?: (page: Page, termo: string) => Promise<Produto[]>;  // API
}
```

### Dois modos de scraping

| Modo | Como funciona | Sites |
|---|---|---|
| **DOM** | Navega até `searchUrl()`, espera `waitStrategy`, faz `page.evaluate(extrairProdutos)`. O callback roda no contexto do navegador e extrai do DOM. | KaBuM!, Pichau |
| **API** | Consulta o endpoint via `page.request.get()` com o contexto Playwright, sem abrir a home quando `precisaHomePrimeiro` é `false`. | TerabyteShop |

### Anti-detecção

- Fingerprint único por `browser.newContext()` com rotação por site para evitar repetir a mesma assinatura em buscas consecutivas
- User-Agent de Chrome desktop real/recente (Windows, Linux e macOS), viewport 1920±200 × 1080±100, locale `pt-BR` e timezone `America/Sao_Paulo`
- Spoof via `addInitScript` de `navigator.webdriver`, `language`, `languages`, `platform`, `plugins`, `mimeTypes`, `hardwareConcurrency`, `deviceMemory` e WebGL vendor/renderer
- Comportamento humano simulado após navegação: movimento gradual de mouse, scroll via `page.mouse.wheel()` em 3-5 passos de 200-400px e pausas aleatórias entre ações

### Cloudflare / Challenge Detection

`detectarChallenge()` verifica se o título ou body contém "Um momento", "Just a moment", "verificação de segurança", "Enable JavaScript". Em modo headless retorna array vazio; em modo não-headless aguarda resolução manual (60s timeout).

---

## Server API

### Endpoints

| Rota | Método | Parâmetros | Descrição |
|---|---|---|---|
| `/api/search` | GET | `q` (termo), `site` (key, default `kabum`) | Executa busca e retorna `Resultado` |
| `/api/sites` | GET | — | Lista sites disponíveis `[{ key, nome }]` |
| `/api/auto/config` | GET | — | Lista produtos configurados para busca automática |
| `/api/auto/config` | POST | Body: `[{ termo, site }]` | Salva configuração (substitui tudo, max 10) |
| `/api/auto/config/:id` | DELETE | — | Remove um item (soft delete) |
| `/api/auto/status` | GET | — | Status do scheduler + última/próxima execução |
| `/api/auto/results` | GET | — | Última execução com resultados por termo |
| `/api/auto/run` | POST | — | Dispara execução manual imediatamente |
| `/api/watch/alerts` | GET | — | Lista alertas ativos e disparados |
| `/api/watch/alerts` | POST | Body: `{ nome, url, preco_alvo, site, canal: "discord" }` | Cria alerta de preço |
| `/api/watch/alerts/:id` | PATCH | Body parcial | Atualiza alerta/status |
| `/api/watch/alerts/:id` | DELETE | — | Remove alerta (soft delete/pausa) |
| `/api/watch/preview` | GET | `url`, `site` | Identifica produto por URL para preencher nome automaticamente |
| `/api/watch/status` | GET | — | Status do scheduler Watch + webhook |
| `/api/watch/run` | POST | — | Dispara verificação manual dos alertas |

### Static serving

- Se `client/dist/index.html` existir → SPA mode (serve tudo do `client/dist/`, fallback SPA para rotas sem extensão)
- Senão → Legacy mode (serve arquivos da raiz do projeto)
- Em produção, `dist/server.js` resolve caminhos persistentes a partir da raiz do projeto, não de `dist/`

---

## Frontend Details

### Component Tree

```
App
├── SearchForm          # Input + site tabs + submit button
├── SearchHistory       # "Últimas buscas" pills (localStorage)
├── StateMessage        # initial | loading | empty | error
├── ProductGrid
│   └── ProductCard[]   # Card com imagem, preço, botão "Criar alerta" e "Ir para a Loja"
├── AutoSearchPanel     # (quando modo='auto')
    ├── AutoConfigList  # Lista de até 10 produtos configurados com add/remove/reorder
    └── AutoResultsView # Resultados da última execução por termo com ProductGrid
└── WatchPanel          # (quando modo='watch') status + formulário + lista de alertas
```

### State Machine (App.tsx)

```
modo: 'manual' | 'auto' | 'watch'

Manual:
  initial → (search) → loading → results | empty | error
                                  ↑
                              (new search)

Auto:
  AutoSearchPanel
    ├── tab 'config' → AutoConfigList (local edit/reorder → save → POST /api/auto/config)
    └── tab 'results' → AutoResultsView (fetch /api/auto/results)

Watch:
  WatchPanel
    ├── status → GET /api/watch/status
    ├── form/list → GET/POST/DELETE/PATCH /api/watch/alerts
    └── run → POST /api/watch/run
```

### Styling

Detalhes de tema, cores, tipografia, background, animações, componentes visuais, responsividade e acessibilidade ficam em `DESIGN.md`. Consulte esse arquivo apenas em tarefas de UI/UX, layout, motion ou mudanças visuais.

### Hooks

- **`useSearch`** (`client/src/hooks/useSearch.ts`): Gerencia estado da busca (loading, produtos, erro). `search(q, siteKey)` faz GET em `/api/search`. `fetchSites()` carrega lista de sites.
- **`useSearchHistory`** (`client/src/hooks/useSearchHistory.ts`): Persiste últimas 5 buscas no `localStorage`. `addEntry()` evita duplicatas.
- **`useAutoConfig`** (`client/src/hooks/useAutoConfig.ts`): CRUD da configuração automática. `fetchConfig()`, `saveConfig(entries)`, `removeConfig(id)`, `fetchStatus()`. A ordem visual editada em `AutoConfigList` é persistida pela posição enviada ao `saveConfig`.
- **`useAutoResults`** (`client/src/hooks/useAutoResults.ts`): Resultados automáticos. `fetchResults()` carrega última execução, `triggerRun()` dispara execução manual.
- **`useWatchAlerts`** (`client/src/hooks/useWatchAlerts.ts`): Alertas Watch. `fetchAlerts()`, `fetchStatus()`, `createAlert(input)`, `removeAlert(id)`, `triggerRun()`.

---

## Auto-Search (intervalo configurável)

O scraper pode ser configurado para buscar até 10 produtos automaticamente. O intervalo padrão é 6 horas, configurável por `AUTO_INTERVAL_HOURS` no `.env`, com mínimo obrigatório de 3 horas.

### Persistência de resultados

- A busca automática apenas salva resultados no SQLite e atualiza o histórico de preços
- Ela não envia Discord, mesmo quando `DISCORD_WEBHOOK_URL` está configurado
- Alertas no Discord pertencem exclusivamente ao fluxo Watch, baseado em URLs específicas e preço-alvo

### Database

SQLite em `data/scraper.db` com 3 tabelas:

| Tabela | Descrição |
|---|---|
| `auto_config` | Produtos configurados (termo + site + ordem + soft delete) |
| `auto_execucoes` | Cada ciclo de busca (início, fim, status) |
| `auto_resultados` | Resultados individuais por termo em cada execução |

### Scheduler

- Inicializado junto com o servidor
- Executa em grades baseadas no intervalo configurado. Com `AUTO_INTERVAL_HOURS=3`: 00:00, 03:00, 06:00, 09:00...
- Usa fuso fixo `America/Sao_Paulo` para agendamento, persistência de execução e exibição no frontend, independente do timezone da VPS
- Na inicialização, verifica se está atrasado além do intervalo configurado e executa imediatamente
- Recuperação de crash: se última execução tem status 'executando', executa novamente
- Buscas são sequenciais (1 por vez) para evitar múltiplos browsers simultâneos

### Frontend (Aba "Automática")

- Toggle "🔍 Manual" / "⏰ Automática" no header (state `modo` em App.tsx)
- **AutoSearchPanel**: container com barra de status (status + próxima execução + contagem) e botão "Executar agora"
  - **Sub-aba "⚙️ Configurar"**: AutoConfigList — formulário inline para adicionar/remover/reordenar produtos com termo + site selector
  - **Sub-aba "📊 Resultados"**: AutoResultsView — lista da última execução com ProductGrid por termo

## Watch de preços (alertas de queda)

- Alertas monitoram uma **URL específica** de produto, não uma busca por termo
- Cadastro: nome, URL, preço-alvo, site e canal `discord`; ao colar uma URL válida, o frontend consulta `/api/watch/preview` e preenche o nome com o título identificado, sem sobrescrever edição manual
- O botão "Criar alerta" em `ProductCard` abre a aba Watch com nome/URL/site/preço preenchidos
- O scheduler roda a cada `WATCH_INTERVAL_HOURS` (padrão 3h, mínimo 3h)
- Cada verificação usa `buscarProdutoPorUrl(site, url, nome)` e salva histórico em `price_history`
- Quando `preço atual <= preço-alvo`, envia Discord webhook e marca o alerta como `disparado` + `ativo = 0`
- Se `DISCORD_WEBHOOK_URL` estiver vazio ou o envio falhar, o alerta permanece ativo e registra erro
- `watch_checks` armazena cada tentativa com status `ok`, `erro` ou `disparado`

---

## Commands

```bash
npm run dev           # Dev local com descoberta automática de portas livres
npm run dev:local     # Alias do dev local automático
npm run dev:fixed     # Dev completo fixo: client 5173 + servidor 3000
npm run dev:server    # Apenas servidor (tsx watch server.ts)
npm run dev:client    # Apenas client (Vite dev server)
npm run build         # Compila TypeScript (tsc, para deploy)
npm run build:client  # Build do frontend React → client/dist/
npm run build:prod    # Build completo para VPS/FileZilla: client/dist + dist/
npm run start         # Node production (dist/server.js)
npm run test:discord  # Envia uma mensagem de teste no webhook DISCORD_WEBHOOK_URL
npm test              # Testes Vitest do backend/scraper sem rede real
npm run test:watch    # Testes Vitest do backend/scraper em watch mode
npm run test:all      # Testes root + client
npm run typecheck     # TypeScript check (root + client via npm -w)
cd client && npm test # Testes Vitest do React/hooks em jsdom
```

### Variáveis de ambiente

```bash
AUTO_INTERVAL_HOURS=3
WATCH_INTERVAL_HOURS=3
PORT=3000
API_PORT=3000
CLIENT_PORT=5173
DISCORD_WEBHOOK_URL=
DISCORD_WEBHOOK_AVATAR_URL=https://alguma-url-da-imagem.png
```

## Economia de contexto e tokens

- Antes de ler arquivos grandes, use `rg` para localizar símbolos, rotas, hooks, componentes ou testes relevantes.
- Leia apenas os arquivos diretamente relacionados à tarefa atual; não reabra documentação de deploy, VPS ou comandos operacionais salvo quando a tarefa envolver deploy/produção.
- Para mudanças de frontend, priorize `client/src/App.tsx`, o componente/hook afetado, `client/src/types.ts` quando necessário e `DESIGN.md` apenas para mudanças visuais.
- Para mudanças de backend/API, priorize `server.ts`, `scraper.ts` e testes relacionados em `tests/`; não abrir arquivos do client sem necessidade.
- Para mudanças no scraper de um site específico, leia somente a configuração/extração daquele site em `scraper.ts` e fixtures/testes correspondentes.
- Rode validações proporcionais ao escopo: backend/root → `npm run typecheck` e/ou `npm test`; client → `cd client && npm run build` e testes do hook/componente afetado quando houver; docs → não rodar build/testes salvo se solicitado.
- Evite resumir ou colar grandes trechos de código na resposta final; cite arquivos e explique apenas o que mudou ou foi verificado.
- Não investigar `data/`, `client/dist/`, `dist/`, `node_modules/` ou caches, salvo quando a tarefa pedir explicitamente build, persistência ou artefatos gerados.

### OpenCode Slash Commands

| Comando | Descrição |
|---|---|
| `/commit` | Analisa `git status` + diffs, verifica conflitos/segredos, stageia alterações coesas com `git add -A` e cria commit automático em pt-BR seguindo Conventional Commits. Não executa `git push`. |

**Workflow padrão:**
1. `cd client && npm run build` — após qualquer mudança em `client/`
2. `npm run dev:server` — testar servidor servindo o build
3. Ou `npm run dev` — desenvolvimento com HMR escolhendo portas livres automaticamente

**Workflow de testes:**
1. `npm run typecheck` — valida TypeScript do root
2. `npm test` — cobre helpers do scraper, rotas HTTP, SQLite temporário, scheduler e Watch sem acessar lojas reais
3. `cd client && npm test` — cobre hooks/componentes críticos com `fetch` mockado
4. `cd client && npm run build` — obrigatório após mudanças em `client/`

**Deploy VPS/FileZilla:**
1. `npm run build:prod` — gera `client/dist/` e `dist/`
2. Subir para a VPS os arquivos do projeto sem `node_modules/`
3. Na VPS, executar `npm install`, `npx playwright install chromium` e `npm start` ou PM2 apontando para `dist/server.js`

---

## Conventions

- **Scraper logic** em `scraper.ts`, **server logic** em `server.ts`
- **Novos sites** seguem o pattern `SiteConfig` — adicionar entrada em `SITES` e implementar `extrairProdutos` (DOM) ou `extrairProdutosViaApi` (API)
- **Site badge colors** — ao adicionar um novo site, registrar sua cor em `SITE_COLORS` no `App.tsx` e `ProductCard.tsx`, e adicionar variáveis CSS em `index.css`
- **TypeScript strict mode** — rodar `npm run typecheck` após qualquer alteração em `.ts`
- **Server-side SQLite** — usar `better-sqlite3` com db preparado via `db.prepare()`, transações com `db.transaction()`
- **Auto-search** — toda lógica de scheduler fica em `server.ts`; frontend de auto-busca fica em `client/src/components/Auto*.tsx`
- **Soft delete** — items de configuração usam `ativo = 0` em vez de DELETE físico
- **Resultados automáticos** — armazenados como JSON text no SQLite (coluna `produtos`)
- **Scheduler** — execução sequencial (1 busca por vez), recuperação de crash na inicialização
- **Logs operacionais** — sempre que possível, fluxos manuais, schedulers e endpoints que disparam processamento devem registrar `console.log` ao concluir, com prefixo do módulo e resumo curto de totais, sucessos, erros e itens processados (ex.: `[Busca Manual]`, `[Busca Automática]`, `[Watch]`)
- **Horários** — usar `America/Sao_Paulo` no backend e nos formatadores do frontend para evitar diferença de fuso em VPS UTC
- **Intervalo automático** — usar `AUTO_INTERVAL_HOURS` no `.env`; valores abaixo de 3 são elevados para 3
- **Alertas Discord** — usar `DISCORD_WEBHOOK_URL` apenas no Watch; auto-busca não envia notificações
- **Watch** — alertas de queda ficam em `/api/watch/*`; usar soft delete/status em vez de remover fisicamente
- **Após editar `client/`**, rebuildar com `cd client && npm run build` — o servidor serve arquivos estáticos de `client/dist/`
- **Testes automatizados** — usar Vitest; testes de scraper/servidor não devem acessar lojas reais nem tocar `data/scraper.db`; use `SCRAPER_DB_PATH` para SQLite temporário e mocks de `buscarProduto()`/`buscarProdutoPorUrl()`
- **Organização de testes** — testes de backend/root ficam em `tests/` (`tests/scraper.test.ts`, `tests/server.test.ts` e novos arquivos por domínio quando crescer); fixtures mockadas ficam em `tests/fixtures/`; helpers compartilhados ficam em `tests/helpers/`; testes de frontend ficam colocalizados ao lado do hook/componente em `client/src/**`, com sufixo `.test.ts` ou `.test.tsx`
- **Exports nomeados** (evitar `export default` em componentes utilitários)
- **Sem comentários em linha** no código-fonte (documentação concentrada aqui)
- **Português** para nomes de domínio (`Produto`, `buscarProduto`, `SiteConfig`, `termo`, `preco`); inglês para código genérico
- **CLI + Module dual-mode** em `scraper.ts`: `require.main === module` para execução direta, `export` para uso como módulo
- **Server sem frameworks**: Node.js `http` module puro — não adicionar Express, Fastify, etc.
- **Playwright headless** por padrão (`HEADLESS = true`); ajustar para debug
- **Documentação viva**: `AGENTS.md` deve ser mantido atualizado em paralelo a qualquer alteração no projeto — novas funcionalidades, novos sites, refactors, mudanças de comandos, arquitetura ou convenções
