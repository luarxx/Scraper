# Auto Search

Auto Search permite configurar ate 10 produtos para busca automatica.

## Core Rules

- Intervalo default: 6 horas.
- Configuravel por `AUTO_INTERVAL_HOURS` no `.env`.
- Minimo obrigatorio: 3 horas.
- Auto Search salva resultados no SQLite e atualiza historico de precos.
- Auto Search nao envia Discord, mesmo quando `DISCORD_WEBHOOK_URL` esta configurado.
- Alertas Discord pertencem exclusivamente ao fluxo Watch.
- Buscas sao sequenciais, uma por vez, para evitar multiplos browsers simultaneos.

## Backend

- Scheduler e execucao: `server-core/auto.ts`.
- Rotas: `/api/auto/*`.
- Banco: SQLite em `data/scraper.db`.
- Busca: `buscarProduto()`.

## Endpoints

- `GET /api/auto/config`: lista produtos configurados.
- `POST /api/auto/config`: salva configuracao completa, substituindo tudo, max 10.
- `DELETE /api/auto/config/:id`: remove item por soft delete.
- `GET /api/auto/status`: status do scheduler, ultima/proxima execucao.
- `GET /api/auto/results`: ultima execucao com resultados por termo.
- `POST /api/auto/run`: dispara execucao manual imediatamente.

## Database

| Tabela | Descricao |
|---|---|
| `auto_config` | Produtos configurados, termo + site + ordem + soft delete |
| `auto_execucoes` | Cada ciclo de busca, inicio, fim e status |
| `auto_resultados` | Resultados individuais por termo em cada execucao |

## Scheduler

- Inicializado junto com o servidor.
- Executa em grades baseadas no intervalo configurado.
- Com `AUTO_INTERVAL_HOURS=3`: 00:00, 03:00, 06:00, 09:00...
- Usa fuso fixo `America/Sao_Paulo`.
- Usa o mesmo fuso para agendamento, persistencia e exibicao no frontend.
- Na inicializacao, verifica se esta atrasado alem do intervalo configurado e executa imediatamente.
- Recuperacao de crash: se a ultima execucao tem status `executando`, executa novamente.

## Frontend

Componentes e hooks:

- `AutoSearchPanel`: container da aba Automatica.
- `AutoConfigList`: lista de ate 10 produtos configurados, add/remove/reorder.
- `AutoResultsView`: resultados da ultima execucao automatica.
- `useAutoConfig`: CRUD da configuracao automatica.
- `useAutoResults`: resultados e execucao manual.

## Frontend Flow

- Toggle no header alterna Manual/Automatica/Watch via state `modo` em `App.tsx`.
- `AutoSearchPanel` mostra barra de status, proxima execucao, contagem e botao "Executar agora".
- Aba `config`: edicao local e reordenacao em `AutoConfigList`, depois `POST /api/auto/config`.
- `AutoConfigList` usa formulario inline com termo e seletor de site.
- Aba `results`: `AutoResultsView` chama `/api/auto/results` e renderiza `ProductGrid` por termo.
- A ordem visual editada em `AutoConfigList` e persistida pela posicao enviada ao `saveConfig`.
