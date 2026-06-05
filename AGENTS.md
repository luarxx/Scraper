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

---

## Architecture

```
Browser (React SPA)
     │  GET /api/search?q=...&site=...   │   ⏰ Aba "Automática"
     ▼                                   ▼
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
     └── Scheduler (configurável via AUTO_INTERVAL_HOURS, mínimo 3h)
          └── Itera auto_config → buscarProduto() sequencial → salva resultados
```

---

## Code Organization

```
/
├── scraper.ts          # Core: tipos, config dos sites, lógica de scraping, CLI
├── server.ts           # HTTP server: API endpoints + static + SQLite DB + scheduler configurável
├── AGENTS.md           # ← este arquivo
├── DESIGN.md           # Documentação do design system e UI/UX
├── DEPLOY_ORACLE_VPS.md # Guia de deploy na Oracle VPS com FileZilla, Nginx e PM2
├── COMANDOS_VPS.md     # Comandos operacionais para administrar a VPS em produção
├── ATUALIZAR_SITE_VPS.md # Fluxo curto para atualizar a VPS após mudanças locais
├── .env                # Configuração local/produção (AUTO_INTERVAL_HOURS)
├── .env.example        # Exemplo das variáveis de ambiente
├── opencode.json       # Config do opencode (default agent: scraper)
├── tsconfig.json       # TS config (root, CommonJS)
├── package.json        # Scripts: dev, dev:server, typecheck, build
│
├── client/             # Frontend React (sub-projeto ESM)
│   ├── index.html
│   ├── vite.config.ts  # Proxy /api → localhost:3000
│   ├── package.json    # React 19, Vite 8, Tailwind 4
│   ├── tsconfig.json   # Project references
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx           # Layout + state machine + toggle Manual/Auto
│   │   ├── index.css         # Tailwind + custom CSS
│   │   ├── types.ts          # Shared types (Produto, Site, Resultado, Auto*, PricePoint...)
│   │   ├── hooks/
│   │   │   ├── useSearch.ts         # API calls + search state
│   │   │   ├── useSearchHistory.ts  # localStorage history (max 5)
│   │   │   ├── useAutoConfig.ts     # CRUD configuração automática
│   │   │   └── useAutoResults.ts    # Resultados execução automática
│   │   └── components/
│   │       ├── SearchForm.tsx       # Input + site tabs + submit button
│   │       ├── SearchHistory.tsx    # Recent searches pills
│   │       ├── ProductGrid.tsx      # Grid layout + best-option logic
│   │       ├── ProductCard.tsx      # Individual product card
│   │       ├── StateMessage.tsx     # Initial/loading/empty/error states
│   │       ├── PriceHistoryChart.tsx # Gráfico de histórico de preços
│   │       ├── AutoSearchPanel.tsx  # Container da aba Automática (status + sub-abas)
│   │       ├── AutoConfigList.tsx   # Lista/reordenação de até 10 produtos configurados
│   │       └── AutoResultsView.tsx  # Resultados da última execução automática
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
│   └── ProductCard[]   # Card com imagem, store badge, preço, botão "Ir para a Loja"
└── AutoSearchPanel     # (quando modo='auto')
    ├── AutoConfigList  # Lista de até 10 produtos configurados com add/remove/reorder
    └── AutoResultsView # Resultados da última execução por termo com ProductGrid
```

### State Machine (App.tsx)

```
modo: 'manual' | 'auto'

Manual:
  initial → (search) → loading → results | empty | error
                                  ↑
                              (new search)

Auto:
  AutoSearchPanel
    ├── tab 'config' → AutoConfigList (local edit/reorder → save → POST /api/auto/config)
    └── tab 'results' → AutoResultsView (fetch /api/auto/results)
```

### Styling

- **Tema escuro**: fundo `#020617` (slate-950), superfície `#0f172a` (slate-900), variáveis CSS customizadas via `@theme`
- **Cor de destaque**: laranja (`--color-accent: #f97316`), aplicada em inputs, badges e botões
- **Cores por loja**: KaBuM! laranja, Pichau vermelho, Terabyte verde — definidas em `App.tsx`, `ProductCard.tsx`, `SearchHistory.tsx`, `AutoResultsView.tsx`
- **Fontes**: **Inter** (UI principal, Google Fonts) + **DM Sans** (Display pontual, Google Fonts) — carregadas via `<link>` em `index.html`
- **Background**: gradientes radiais fixos e discretos + textura noise SVG `feTurbulence` overlay (35% opacity, `mix-blend-mode: overlay`), sem animação contínua por padrão
- **Scrollbar customizada**: 6px largura, thumb `rgba(249,115,22,0.25)` com hover mais claro
- **Animações**: `fadeIn`, `fadeInUp`, `badgePop`, `dotPulse`, `spinSlow`, `spinReverse`, `shimmer`, `breathe`, `tabActivate`, `radarRing`, `radarSweep`, `numberTick`, `sparkDraw`, `panelSlideIn`, `kpiStagger`, `dotPing` — definidas em `index.css`
- **Motion**: usar animação para feedback de estado, carregamento e expansão/recolhimento; evitar loops decorativos e respeitar `prefers-reduced-motion`
- Efeito vidro (`backdrop-blur-md`) no header sticky
- **KPI cards**: grid de cards com ícone + label + valor + animação curta `kpiStagger`. Usado em status bar (`AutoSearchPanel`) e execution summary + per-termo (`AutoResultsView`)
- **Polimento operacional**: priorizar comparação rápida e confiança visual; sombras moderadas, botões estáveis, labels em sentence case e foco visível preservado
- **Acessibilidade UI**: controles selecionáveis usam `aria-pressed`; botões iconográficos usam `aria-label`; não remover outline/foco sem substituto visível
- **Termo sections**: gradient wash `linear-gradient(135deg, ${siteColor.light}, transparent 70%)` no background, com barra lateral e border highlight na cor da loja

### Hooks

- **`useSearch`** (`client/src/hooks/useSearch.ts`): Gerencia estado da busca (loading, produtos, erro). `search(q, siteKey)` faz GET em `/api/search`. `fetchSites()` carrega lista de sites.
- **`useSearchHistory`** (`client/src/hooks/useSearchHistory.ts`): Persiste últimas 5 buscas no `localStorage`. `addEntry()` evita duplicatas.
- **`useAutoConfig`** (`client/src/hooks/useAutoConfig.ts`): CRUD da configuração automática. `fetchConfig()`, `saveConfig(entries)`, `removeConfig(id)`, `fetchStatus()`. A ordem visual editada em `AutoConfigList` é persistida pela posição enviada ao `saveConfig`.
- **`useAutoResults`** (`client/src/hooks/useAutoResults.ts`): Resultados automáticos. `fetchResults()` carrega última execução, `triggerRun()` dispara execução manual.

---

## Auto-Search (intervalo configurável)

O scraper pode ser configurado para buscar até 10 produtos automaticamente. O intervalo padrão é 6 horas, configurável por `AUTO_INTERVAL_HOURS` no `.env`, com mínimo obrigatório de 3 horas.

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
- Na inicialização, verifica se está atrasado além do intervalo configurado e executa imediatamente
- Recuperação de crash: se última execução tem status 'executando', executa novamente
- Buscas são sequenciais (1 por vez) para evitar múltiplos browsers simultâneos

### Frontend (Aba "Automática")

- Toggle "🔍 Manual" / "⏰ Automática" no header (state `modo` em App.tsx)
- **AutoSearchPanel**: container com barra de status (status + próxima execução + contagem) e botão "Executar agora"
  - **Sub-aba "⚙️ Configurar"**: AutoConfigList — formulário inline para adicionar/remover/reordenar produtos com termo + site selector
  - **Sub-aba "📊 Resultados"**: AutoResultsView — lista da última execução com ProductGrid por termo

---

## Commands

```bash
npm run dev           # Dev completo: servidor + client (Vite HMR) em paralelo
npm run dev:server    # Apenas servidor (tsx watch server.ts)
npm run dev:client    # Apenas client (Vite dev server)
npm run build         # Compila TypeScript (tsc, para deploy)
npm run build:client  # Build do frontend React → client/dist/
npm run build:prod    # Build completo para VPS/FileZilla: client/dist + dist/
npm run start         # Node production (dist/server.js)
npm run typecheck     # TypeScript check (root + client via npm -w)
```

### OpenCode Slash Commands

| Comando | Descrição |
|---|---|
| `/commit` | Analisa `git status` + diffs, verifica conflitos/segredos, stageia alterações coesas com `git add -A` e cria commit automático em pt-BR seguindo Conventional Commits. Não executa `git push`. |

**Workflow padrão:**
1. `cd client && npm run build` — após qualquer mudança em `client/`
2. `npm run dev:server` — testar servidor servindo o build
3. Ou `npm run dev` — desenvolvimento com HMR

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
- **Intervalo automático** — usar `AUTO_INTERVAL_HOURS` no `.env`; valores abaixo de 3 são elevados para 3
- **Após editar `client/`**, rebuildar com `cd client && npm run build` — o servidor serve arquivos estáticos de `client/dist/`
- **Exports nomeados** (evitar `export default` em componentes utilitários)
- **Sem comentários em linha** no código-fonte (documentação concentrada aqui)
- **Português** para nomes de domínio (`Produto`, `buscarProduto`, `SiteConfig`, `termo`, `preco`); inglês para código genérico
- **CLI + Module dual-mode** em `scraper.ts`: `require.main === module` para execução direta, `export` para uso como módulo
- **Server sem frameworks**: Node.js `http` module puro — não adicionar Express, Fastify, etc.
- **Playwright headless** por padrão (`HEADLESS = true`); ajustar para debug
- **Documentação viva**: `AGENTS.md` deve ser mantido atualizado em paralelo a qualquer alteração no projeto — novas funcionalidades, novos sites, refactors, mudanças de comandos, arquitetura ou convenções
