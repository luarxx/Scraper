# client — Frontend React

Interface SPA para o Scraper de e-commerces.

## Stack

- **React 19** + TypeScript 6
- **Vite 8** (dev server com HMR, proxy de `/api`)
- **Tailwind CSS 4** (`@tailwindcss/vite` plugin)
- Fontes: Outfit (display) + DM Sans (body)

## Desenvolvimento

```bash
npm run dev        # Vite dev server na porta 5173
npm run build      # tsc -b && vite build → client/dist/
npm run lint       # ESLint
```

O `vite.config.ts` faz proxy de `/api` para `API_PORT`/`PORT` ou `localhost:3000`. No uso normal, rode o projeto pela raiz com `npm run dev` ou `npm run dev:fixed` para o servidor Node e o Vite usarem a mesma porta de API.

## Componentes

```
App
├── SearchForm          # Input + dropdown de site + botão buscar
├── SearchHistory       # Pills de buscas recentes (localStorage, max 5)
├── StateMessage        # initial | loading | empty | error
└── ProductGrid
    └── ProductCard[]   # Card individual com badge "Melhor Opção"
```

## Estados

`initial → loading → results | empty | error`

## Build para produção

```bash
cd client && npm run build
```

O servidor (`server.ts`) serve os arquivos de `client/dist/` automaticamente.
