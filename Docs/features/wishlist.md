# Lista de Desejos

Desejos salva produtos favoritos por URL especifica e acompanha quedas em relacao ao ultimo preco observado.

## Core Rules

- Itens ficam no SQLite, nao no `localStorage`.
- A chave logica e `site + url`; salvar o mesmo produto novamente atualiza o snapshot e reativa o item.
- Remocao usa soft delete: `ativo = 0` e `status = 'pausado'`.
- O scheduler compara `preco atual < ultimo_preco_salvo`.
- Quando houver queda, envia Discord e atualiza o ultimo preco salvo para o novo valor.
- Se o webhook falhar ou nao estiver configurado, registra erro no item/check e ainda atualiza a referencia de preco.
- Cada checagem salva historico em `price_history`.

## Backend

- Scheduler e notificacoes: `server-core/wishlist.ts`.
- Rotas: `/api/wishlist/*`.
- Persistencia: `wishlist_items`, `wishlist_checks` e `price_history`.
- Intervalo: `WISHLIST_INTERVAL_HOURS`, default 3h, minimo 3h.

## Endpoints

- `GET /api/wishlist/items`: lista desejos ativos.
- `POST /api/wishlist/items`: salva ou atualiza produto por `site + url`.
- `PATCH /api/wishlist/items/:id`: atualiza snapshot/status.
- `DELETE /api/wishlist/items/:id`: remove por soft delete.
- `GET /api/wishlist/status`: status do scheduler e webhook.
- `POST /api/wishlist/run`: dispara verificacao manual.

## Frontend

- `ProductCard`: botao "Salvar nos desejos" / "Remover dos desejos".
- `WishlistPanel`: aba Desejos com status, botao "Atualizar todos", cards e `PriceHistoryChart`.
- `useWishlist`: hook de CRUD/status/execucao manual.
