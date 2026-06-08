# Conventions

## Architecture Boundaries

- Scraper logic fica em `scraper-core/`; `scraper.ts` e fachada publica e CLI.
- Server logic fica em `server-core/`; `server.ts` e fachada publica e inicializacao.
- Server usa Node.js `http` module puro. Nao adicionar Express, Fastify ou outro framework HTTP.
- `scraper.ts` mantem dual-mode: `require.main === module` chama `scraper-core/cli.ts`, e `export` mantem a API publica.

## TypeScript and Naming

- TypeScript strict mode.
- Preferir exports nomeados, evitando `export default` em componentes utilitarios.
- Portugues para nomes de dominio: `Produto`, `buscarProduto`, `SiteConfig`, `termo`, `preco`.
- Ingles para codigo generico.
- Sem comentarios em linha no codigo-fonte salvo real necessidade; concentrar documentacao em Markdown.

## Scraper

- Novos sites seguem o pattern `SiteConfig`.
- Adicionar entrada em `SITES`.
- DOM scraping implementa `extrairProdutos`.
- API scraping implementa `extrairProdutosViaApi`.
- Playwright headless por padrao (`HEADLESS = true`); ajustar para debug apenas quando necessario.

## Frontend Site Badges

Ao adicionar um novo site, registrar a cor em:

- `SITE_COLORS` em `client/src/App.tsx`
- `SITE_COLORS` em `client/src/components/ProductCard.tsx`
- variaveis CSS relacionadas em `client/src/index.css`

## SQLite and Persistence

- Server-side SQLite usa `better-sqlite3`.
- Usar `db.prepare()` e transacoes com `db.transaction()`.
- Auto Search usa soft delete em configs: `ativo = 0`, nao DELETE fisico.
- Watch usa soft delete/status para alertas, nao remocao fisica.
- Resultados automaticos ficam como JSON text na coluna `produtos`.

## Scheduling and Time

- Horarios devem usar `America/Sao_Paulo` no backend e nos formatadores do frontend.
- Isso evita diferenca de fuso em VPS UTC.
- Auto Search usa `AUTO_INTERVAL_HOURS`; valores abaixo de 3 sao elevados para 3.
- Auto Search usa `AUTO_MAX_CONCURRENCY`; default 3, minimo 1 e maximo 10.
- Watch usa `WATCH_INTERVAL_HOURS`; valores abaixo de 3 sao elevados para 3.
- Auto Search executa buscas com concorrencia limitada; Watch executa alertas em sequencia.
- Schedulers devem recuperar crash quando a ultima execucao ficou com status `executando`.

## Notifications

- `DISCORD_WEBHOOK_URL` pertence ao fluxo Watch.
- Auto Search nao envia notificacoes Discord.
- Alertas no Discord sao baseados em URL especifica e preco-alvo.

## Operational Logs

Sempre que possivel, fluxos manuais, schedulers e endpoints que disparam processamento devem registrar `console.log` ao concluir, com:

- prefixo curto do modulo;
- resumo de totais;
- sucessos;
- erros;
- itens processados.

Exemplos de prefixo:

- `[Busca Manual]`
- `[Busca Automatica]`
- `[Watch]`

## Living Documentation

Manter `AGENTS.md` e `Docs/` atualizados em paralelo a qualquer alteracao de:

- funcionalidades;
- novos sites;
- refactors;
- comandos;
- arquitetura;
- convencoes.
