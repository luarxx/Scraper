# HTTP Endpoints

Servidor HTTP nativo em Node.js, sem Express/Fastify.

## Search

| Rota | Metodo | Parametros | Descricao |
|---|---|---|---|
| `/api/search` | GET | `q` termo, `site` key default `kabum` | Executa busca e retorna `Resultado` |
| `/api/sites` | GET | nenhum | Lista sites disponiveis `[{ key, nome }]` |

## Auto Search

| Rota | Metodo | Parametros/body | Descricao |
|---|---|---|---|
| `/api/auto/config` | GET | nenhum | Lista produtos configurados para busca automatica |
| `/api/auto/config` | POST | Body: `[{ termo, site }]` | Salva configuracao, substitui tudo, max 10 |
| `/api/auto/config/:id` | DELETE | nenhum | Remove um item por soft delete |
| `/api/auto/status` | GET | nenhum | Status do scheduler + ultima/proxima execucao |
| `/api/auto/results` | GET | nenhum | Ultima execucao com resultados por termo |
| `/api/auto/run` | POST | nenhum | Dispara execucao manual imediatamente |

## Watch Alerts

| Rota | Metodo | Parametros/body | Descricao |
|---|---|---|---|
| `/api/watch/alerts` | GET | nenhum | Lista alertas ativos e disparados |
| `/api/watch/alerts` | POST | Body: `{ nome, url, preco_alvo, site, canal: "discord" }` | Cria alerta de preco |
| `/api/watch/alerts/:id` | PATCH | Body parcial | Atualiza alerta/status |
| `/api/watch/alerts/:id` | DELETE | nenhum | Remove alerta por soft delete/pausa |
| `/api/watch/preview` | GET | `url`, `site` | Identifica produto por URL para preencher nome automaticamente |
| `/api/watch/status` | GET | nenhum | Status do scheduler Watch + webhook |
| `/api/watch/run` | POST | nenhum | Dispara verificacao manual dos alertas |

## Static Serving

- Se `client/dist/index.html` existir, o servidor serve a SPA a partir de `client/dist/`.
- Rotas sem extensao usam fallback SPA.
- Se `client/dist/index.html` nao existir, o servidor usa legacy mode e serve arquivos da raiz.
- Em producao, `dist/server.js` resolve caminhos persistentes a partir da raiz do projeto, nao de `dist/`.

## Route Organization

Handlers HTTP ficam em `server-core/routes/`, organizados por contexto:

- search;
- auto;
- watch;
- history.
