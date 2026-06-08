# Manual Search

Busca manual e o fluxo principal de pesquisa sob demanda.

## Backend

- Endpoint: `GET /api/search?q=...&site=...`
- Site default: `kabum`
- Handler: `server-core/routes/search*`
- Scraper: `scraper.ts:buscarProduto()`
- Implementacao principal: `scraper-core/search.ts`

## Frontend

Componentes e hooks principais:

- `client/src/App.tsx`: state machine e modo `manual`.
- `client/src/hooks/useSearch.ts`: API calls e estado de busca.
- `client/src/hooks/useSearchHistory.ts`: historico local.
- `client/src/components/SearchForm.tsx`: input, site tabs e submit.
- `client/src/components/SearchHistory.tsx`: pills das ultimas buscas.
- `client/src/components/StateMessage.tsx`: initial/loading/empty/error.
- `client/src/components/ProductGrid.tsx`: grid e best-option logic.
- `client/src/components/ProductCard.tsx`: card individual.

## State Machine

```txt
Manual:
  initial -> search -> loading -> results | empty | error
                              ^
                              |
                           new search
```

## Hook Behavior

`useSearch` gerencia loading, produtos e erro.

- `search(q, siteKey)` faz GET em `/api/search`.
- `fetchSites()` carrega a lista de sites disponiveis em `/api/sites`.

`useSearchHistory` persiste as ultimas 5 buscas no `localStorage`.

- `addEntry()` evita duplicatas.

## Product Card

`ProductCard` mostra produto, imagem, preco, parcelamento, site, botao "Criar alerta" e botao "Ir para a Loja".

O botao "Criar alerta" muda o app para a aba Watch com nome, URL, site e preco preenchidos quando possivel.
