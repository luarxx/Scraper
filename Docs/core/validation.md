# Validation

Rode validacoes proporcionais ao escopo da mudanca.

## Backend/Root

Use quando alterar scraper, servidor, SQLite, rotas ou schedulers:

```bash
npm run typecheck
npm test
```

`npm test` cobre helpers do scraper, rotas HTTP, SQLite temporario, scheduler e Watch sem acessar lojas reais.

## Frontend

Use quando alterar `client/`:

```bash
cd client && npm test
cd client && npm run build
```

`cd client && npm test` cobre hooks/componentes criticos com `fetch` mockado.

`cd client && npm run build` e obrigatorio apos qualquer mudanca em `client/`, porque o servidor serve arquivos estaticos de `client/dist/`.

## Production/Deploy

Use quando preparar artefatos de producao:

```bash
npm run build:prod
```

Esse comando gera `client/dist/` e `dist/`.

## Docs-Only

Para mudancas somente de documentacao, nao rodar build/testes salvo se solicitado.

## Test Safety

- Testes automatizados usam Vitest.
- Testes de scraper/servidor nao devem acessar lojas reais.
- Testes de scraper/servidor nao devem tocar `data/scraper.db`.
- Use `SCRAPER_DB_PATH` para SQLite temporario.
- Use mocks de `buscarProduto()` e `buscarProdutoPorUrl()`.

## Test Organization

- Testes backend/root ficam em `tests/`.
- Arquivos atuais incluem `tests/scraper.test.ts` e `tests/server.test.ts`.
- Novos testes backend devem ser separados por dominio quando crescerem.
- Fixtures mockadas ficam em `tests/fixtures/`.
- Helpers compartilhados ficam em `tests/helpers/`.
- Testes frontend ficam colocalizados em `client/src/**`.
- Testes frontend usam sufixo `.test.ts` ou `.test.tsx`.

## Context-Efficient Validation

- Backend/root: priorize `npm run typecheck` e/ou `npm test`.
- Frontend: rode build e testes do hook/componente afetado quando houver.
- Docs: nao rode build/testes salvo pedido explicito.
