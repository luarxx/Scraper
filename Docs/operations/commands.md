# Commands

## Development

```bash
npm run dev           # Dev local com descoberta automatica de portas livres
npm run dev:local     # Alias do dev local automatico
npm run dev:fixed     # Dev completo fixo: client 5173 + servidor 3000, sem fallback silencioso
npm run dev:server    # Apenas servidor, tsx watch server.ts
npm run dev:client    # Apenas client, Vite dev server
```

## Build and Start

```bash
npm run build         # Compila TypeScript, tsc, para deploy
npm run build:client  # Build do frontend React -> client/dist/
npm run build:prod    # Build completo para VPS/FileZilla: client/dist + dist/
npm run start         # Node production, dist/server.js
```

O build do client copia os arquivos PWA estaticos de `client/public/` para `client/dist/`, incluindo `manifest.webmanifest`, `sw.js` e icones de instalacao.

## Tests

```bash
npm test              # Testes Vitest do backend/scraper sem rede real
npm run test:watch    # Testes Vitest do backend/scraper em watch mode
npm run test:all      # Testes root + client
npm run typecheck     # TypeScript check, root + client via npm -w
cd client && npm test # Testes Vitest do React/hooks em jsdom
```

## Discord

```bash
npm run test:discord  # Envia mensagem de teste no DISCORD_WEBHOOK_URL
```

## Environment Variables

```bash
AUTO_INTERVAL_HOURS=3
AUTO_MAX_CONCURRENCY=3
WATCH_INTERVAL_HOURS=3
PORT=3000
API_PORT=3000
CLIENT_PORT=5173
DISCORD_WEBHOOK_URL=
DISCORD_WEBHOOK_AVATAR_URL=https://alguma-url-da-imagem.png
```

## OpenCode Slash Commands

| Comando | Descricao |
|---|---|
| `/commit` | Analisa `git status` + diffs, verifica conflitos/segredos, stageia alteracoes coesas com `git add -A` e cria commit automatico em pt-BR seguindo Conventional Commits. Nao executa `git push`. |

## Default Workflow

1. `cd client && npm run build` apos qualquer mudanca em `client/`.
2. `npm run dev:server` para testar servidor com restart automatico.
3. Ou `npm run dev` para desenvolvimento com HMR e portas livres automaticamente.

## Test Workflow

1. `npm run typecheck` valida TypeScript do root.
2. `npm test` cobre backend/scraper sem rede real.
3. `cd client && npm test` cobre hooks/componentes criticos com `fetch` mockado.
4. `cd client && npm run build` e obrigatorio apos mudancas em `client/`.
