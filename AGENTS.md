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
     │  GET /api/search?q=...&site=...
     ▼
Server (server.ts — Node.js http)
     │
     ├── serve SPA from client/dist/ (production)
     │   └── fallback: serve from root (legacy)
     │
     └── /api/search → scraper.ts:buscarProduto()
                         │
                         ├── KaBuM!      → DOM scraping (navega + evaluate)
                         ├── Pichau      → DOM scraping (navega + evaluate)
                         └── TerabyteShop → API scraping (fetch interna)
```

---

## Code Organization

```
/
├── scraper.ts          # Core: tipos, config dos sites, lógica de scraping, CLI
├── server.ts           # HTTP server: API endpoints + static file serving
├── AGENTS.md           # ← este arquivo
├── DESIGN.md           # Documentação do design system e UI/UX
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
│   │   ├── App.tsx           # Layout + state machine
│   │   ├── index.css         # Tailwind + custom CSS
│   │   ├── types.ts          # Shared types (Produto, Site, Resultado)
│   │   ├── hooks/
│   │   │   ├── useSearch.ts         # API calls + search state
│   │   │   └── useSearchHistory.ts  # localStorage history (max 5)
│   │   └── components/
│   │       ├── SearchForm.tsx       # Input + site dropdown + submit
│   │       ├── SearchHistory.tsx    # Recent searches pills
│   │       ├── ProductGrid.tsx      # Grid layout + best-option logic
│   │       ├── ProductCard.tsx      # Individual product card
│   │       └── StateMessage.tsx     # Initial/loading/empty/error states
│   └── dist/            # Build output (served in production)
│
├── data/
│   ├── resultado.json   # Último resultado do scraper (CLI)
│   └── resultado.js     # Mesmo resultado, formato `window.__RESULT`
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
| **API** | Navega até `urlBase` (se `precisaHomePrimeiro`), depois faz `fetch()` interno via `page.evaluate()` chamando `apiUrl()`. | TerabyteShop |

### Anti-detecção

- `navigator.webdriver = false` via `addInitScript`
- User-Agent de Chrome real
- Viewport 1920×1080, locale `pt-BR`
- Scroll simulado após carregar página (DOM mode)

### Cloudflare / Challenge Detection

`detectarChallenge()` verifica se o título ou body contém "Um momento", "Just a moment", "verificação de segurança", "Enable JavaScript". Em modo headless retorna array vazio; em modo não-headless aguarda resolução manual (60s timeout).

---

## Server API

### Endpoints

| Rota | Método | Parâmetros | Descrição |
|---|---|---|---|
| `/api/search` | GET | `q` (termo), `site` (key, default `kabum`) | Executa busca e retorna `Resultado` |
| `/api/sites` | GET | — | Lista sites disponíveis `[{ key, nome }]` |

### Static serving

- Se `client/dist/index.html` existir → SPA mode (serve tudo do `client/dist/`, fallback SPA para rotas sem extensão)
- Senão → Legacy mode (serve arquivos da raiz do projeto)

---

## Frontend Details

### Component Tree

```
App
├── SearchForm          # Input + site tabs + submit button
├── SearchHistory       # "Últimas buscas" pills (localStorage)
├── StateMessage        # initial | loading | empty | error
└── ProductGrid
    └── ProductCard[]   # Card com imagem no topo, store badge, preço, parcelamento e botão gradiente "Ir para a Loja"
```

### State Machine (App.tsx)

```
initial → (search) → loading → results | empty | error
                                ↑
                            (new search)
```

### Styling

- **Tema escuro**: fundo `#020617` (slate-950), superfície `#0f172a` (slate-900), variáveis CSS customizadas via `@theme`
- **Cor de destaque**: laranja (`--color-accent: #f97316`), aplicada em inputs, badges e botões
- **Cores por loja**: KaBuM! laranja, Pichau vermelho, Terabyte verde — definidas em `App.tsx`, `ProductCard.tsx` e `SearchHistory.tsx`
- **Fontes**: `system-ui` stack (nativas do sistema), sem dependência externa
- **Background animado**: gradientes radiais fixos com `gradientShift` (30s infinite alternate)
- **Animações**: `fadeIn`, `fadeInUp`, `badgePop`, `dotPulse`, `spinSlow`, `spinReverse`, `shimmer`, `breathe`, `tabActivate`, `radarRing`, `radarSweep`, `gradientShift` — definidas em `index.css`
- Efeito vidro (`backdrop-blur-md`) no header sticky

### Hooks

- **`useSearch`** (`client/src/hooks/useSearch.ts`): Gerencia estado da busca (loading, produtos, erro). `search(q, siteKey)` faz GET em `/api/search`. `fetchSites()` carrega lista de sites.
- **`useSearchHistory`** (`client/src/hooks/useSearchHistory.ts`): Persiste últimas 5 buscas no `localStorage`. `addEntry()` evita duplicatas.

---

## Commands

```bash
npm run dev           # Dev completo: servidor + client (Vite HMR) em paralelo
npm run dev:server    # Apenas servidor (tsx watch server.ts)
npm run dev:client    # Apenas client (Vite dev server)
npm run build         # Compila TypeScript (tsc, para deploy)
npm run build:client  # Build do frontend React → client/dist/
npm run start         # Node production (dist/server.js)
npm run typecheck     # TypeScript check (root + client via npm -w)
```

**Workflow padrão:**
1. `cd client && npm run build` — após qualquer mudança em `client/`
2. `npm run dev:server` — testar servidor servindo o build
3. Ou `npm run dev` — desenvolvimento com HMR

---

## Conventions

- **Scraper logic** em `scraper.ts`, **server logic** em `server.ts`
- **Novos sites** seguem o pattern `SiteConfig` — adicionar entrada em `SITES` e implementar `extrairProdutos` (DOM) ou `extrairProdutosViaApi` (API)
- **Site badge colors** — ao adicionar um novo site, registrar sua cor em `SITE_COLORS` no `App.tsx` e `ProductCard.tsx`, e adicionar variáveis CSS em `index.css`
- **TypeScript strict mode** — rodar `npm run typecheck` após qualquer alteração em `.ts`
- **Após editar `client/`**, rebuildar com `cd client && npm run build` — o servidor serve arquivos estáticos de `client/dist/`
- **Exports nomeados** (evitar `export default` em componentes utilitários)
- **Sem comentários em linha** no código-fonte (documentação concentrada aqui)
- **Português** para nomes de domínio (`Produto`, `buscarProduto`, `SiteConfig`, `termo`, `preco`); inglês para código genérico
- **CLI + Module dual-mode** em `scraper.ts`: `require.main === module` para execução direta, `export` para uso como módulo
- **Server sem frameworks**: Node.js `http` module puro — não adicionar Express, Fastify, etc.
- **Playwright headless** por padrão (`HEADLESS = true`); ajustar para debug
- **Documentação viva**: `AGENTS.md` deve ser mantido atualizado em paralelo a qualquer alteração no projeto — novas funcionalidades, novos sites, refactors, mudanças de comandos, arquitetura ou convenções
