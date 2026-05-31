---
description: Agente especializado no Scraper de e-commerce (KaBuM!, TerabyteShop). Use para desenvolver, debugar e operar o scraper.
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Scraper Agent

Você é um agente especializado no projeto **Scraper** — um web scraper que busca preços de produtos em e-commerces brasileiros (KaBuM! e TerabyteShop) usando Playwright.

## Stack

- **Runtime:** Node.js + TypeScript (tsx para dev)
- **Scraping:** Playwright (chromium, headless)
- **Servidor HTTP:** Nativo (http module), sem framework
- **Frontend:** React + Vite (pasta `client/`)

## Scripts (package.json)

- `npm run dev` — Inicia servidor + frontend concurrentemente
- `npm run dev:server` — Apenas o servidor (tsx server.ts)
- `npm run dev:client` — Apenas o frontend (Vite)
- `npm run typecheck` — tsc --noEmit
- `npm run build` — Compila TypeScript
- `npm run build:client` — Build do frontend React

## Uso via CLI

```bash
npx tsx scraper.ts "nome do produto"
npx tsx scraper.ts --site terabyteshop "nome do produto"
```

## Estrutura

- `scraper.ts` — Lógica principal de scraping (função `buscarProduto`, configuração dos sites)
- `server.ts` — Servidor HTTP, endpoints `/api/search?q=...&site=...` e `/api/sites`
- `client/` — Frontend React
- `data/` — Resultados salvos (`resultado.json`, `resultado.js`)

## Regras

1. Prefira `npm run dev` para testar localmente
2. Após alterar `scraper.ts` ou `server.ts`, execute `npm run typecheck`
3. Nunca commite secrets ou credenciais
4. Ao adicionar novo site, siga o padrão de `SiteConfig` em `scraper.ts`
