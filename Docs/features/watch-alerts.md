# Watch Alerts

Watch Alerts monitora quedas de preco por URL especifica de produto.

## Core Rules

- Alertas monitoram uma URL especifica, nao uma busca por termo.
- Cada alerta tem nome, URL, preco-alvo, site e canal `discord`.
- Quando `preco atual <= preco-alvo`, envia Discord webhook.
- Apos disparo bem-sucedido, marca o alerta como `disparado` e `ativo = 0`.
- Se `DISCORD_WEBHOOK_URL` estiver vazio ou o envio falhar, o alerta permanece ativo e registra erro.
- Watch usa soft delete/status em vez de remover fisicamente.

## Backend

- Scheduler e alertas: `server-core/watch.ts`.
- Rotas: `/api/watch/*`.
- Busca por URL: `buscarProdutoPorUrl(site, url, nome)`.
- Historico de preco: `price_history`.
- Historico de verificacoes: `watch_checks`.

## Endpoints

- `GET /api/watch/alerts`: lista alertas ativos e disparados.
- `POST /api/watch/alerts`: cria alerta de preco.
- `PATCH /api/watch/alerts/:id`: atualiza alerta/status.
- `DELETE /api/watch/alerts/:id`: remove alerta por soft delete/pausa.
- `GET /api/watch/preview?url=...&site=...`: identifica produto por URL.
- `GET /api/watch/status`: status do scheduler Watch e webhook.
- `POST /api/watch/run`: dispara verificacao manual dos alertas.

## Request Shape

Criacao de alerta:

```json
{
  "nome": "Produto",
  "url": "https://...",
  "preco_alvo": 999.9,
  "site": "kabum",
  "canal": "discord"
}
```

## Scheduler

- Roda a cada `WATCH_INTERVAL_HOURS`.
- Default: 3h.
- Minimo obrigatorio: 3h.
- Cada verificacao usa `buscarProdutoPorUrl(site, url, nome)`.
- Cada verificacao salva historico em `price_history`.
- `watch_checks` armazena cada tentativa com status `ok`, `erro` ou `disparado`.

## Frontend

Componentes e hooks:

- `WatchPanel`: status, formulario e lista de alertas.
- `useWatchAlerts`: CRUD/status/execucao manual.
- `ProductCard`: botao "Criar alerta".

## Frontend Flow

- Ao colar uma URL valida, o frontend consulta `/api/watch/preview`.
- O preview preenche o nome com o titulo identificado.
- O preview nao sobrescreve uma edicao manual do usuario.
- O botao "Criar alerta" em `ProductCard` abre a aba Watch com nome, URL, site e preco preenchidos quando possivel.
