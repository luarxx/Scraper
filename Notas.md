# Ideias e Próximos Passos — Scraper

Ideias de funcionalidades organizadas por categoria, com valor estimado, complexidade e status.

**Legenda:** ✅ concluído | 🟡 parcialmente concluído / base criada | ⬜ pendente

---

## 1. Persistência de Dados / Banco de Dados

### 1.1 Banco de dados local (SQLite) ✅
Implementado com `better-sqlite3` em `data/scraper.db`. Hoje armazena configuração automática, execuções, resultados e histórico de preços. O cache de busca ainda existe em JSON por TTL curto.
**Valor:** Alto | **Complexidade:** Média

### 1.2 Exportação de resultados (CSV, JSON) ⬜
Usuário baixa o resultado da busca como CSV ou JSON para análise offline.
**Valor:** Médio | **Complexidade:** Baixa

### 1.3 Sistema de migrações SQLite ⬜
Hoje usa `CREATE TABLE IF NOT EXISTS` + `ensureColumn()` para evoluir o schema. Com o projeto crescendo, migrações formais com script sequencial (ex: `migrations/001-initial.sql`, `002-add-column.sql`) evitam quebras silenciosas entre versões e facilitam deploy.
**Valor:** Alto | **Complexidade:** Baixa-Média

### 1.4 Limpeza de arquivos legacy ⬜
`data/resultado.json` e `data/resultado.js` são escritos em toda busca manual mas nunca lidos pelo frontend (legado da era pré-SPA). Remover para evitar confusão e reclaim de espaço.
**Valor:** Baixo | **Complexidade:** Baixa

---

## 2. Monitoramento e Rastreamento de Produtos

### 2.1 Browser persistente por página — modo "Live Price" para promoções-relâmpago ⬜
Em períodos de preços dinâmicos (Black Friday, Cyber Monday, promoções-relâmpago), o intervalo mínimo de 3h do Watch atual é inviável — o preço pode mudar em minutos.

A ideia é manter o browser Playwright **aberto e parado na página do produto**, sem fechar entre verificações:
- **Polling rápido:** re-ler o preço via `page.evaluate()` a cada 30s–2min, sem recarregar a página nem reabrir o Chromium.
- **Zero overhead de launch:** elimina os ~2–5s de inicialização do navegador por ciclo.
- **Disparo instantâneo:** notifica no momento exato em que o preço bater a meta.

**Desafios conhecidos:**
- Páginas podem ficar obsoletas/stale — necessário reload periódico (ex: a cada 15 min).
- Sessões expiram — cookie/session pode invalidar e o preço sumir.
- Consumo de memória: cada página aberta retém um processo Chromium.
- Browser pode cair — precisa de lógica de recuperação automática.
- Gerenciamento de recursos: desligar browser quando a janela de promoção acabar.

**Possível abordagem:** modo opcional no Watch, ativável manualmente pelo usuário ou por agendamento (ex: "ativar monitoramento intensivo de 25/11 a 02/12"). Quando ativo, mantém browser persistente com polling em vez de abrir/fechar a cada ciclo.

**Valor:** Alto (essencial para promoções sazonais) | **Complexidade:** Alta

### 2.2 Lista de favoritos / "Desejos" ✅
Implementado. Usuário salva produtos favoritos no SQLite a partir dos cards, consulta a aba Desejos, atualiza todos de uma vez e recebe Discord quando o preço atual fica menor que o último preço salvo.

- **Backend:** Tabelas `wishlist_items` e `wishlist_checks`, rotas `/api/wishlist/*`, scheduler `WISHLIST_INTERVAL_HOURS` com mínimo de 3h.
- **Frontend:** Aba "Desejos", botão "Salvar nos desejos" nos cards, remoção por soft delete e histórico de preço via `PriceHistoryChart`.
- **Regra:** Deduplica por `site + url`; cada checagem salva `price_history` e atualiza a referência de preço após comparar.
**Valor:** Médio | **Complexidade:** Baixa-Média

### 2.3 "Watch" de preços (alertas de queda) ✅
Implementado. Usuário cadastra alerta com Nome, URL, Preço-alvo, Site e Canal. Servidor verifica periodicamente via scheduler e dispara notificação quando preço ≤ alvo.

- **Frontend:** Botão "Criar Alerta" no card do produto, página de gerenciamento com pausar/reativar/excluir.
- **Criar alerta:** preço-meta, canal de notificação (Console, Discord, SSE) e intervalo de verificação (≥ 3h).
- **Backend:** Alerta salvo em SQLite com status `active`/`paused`/`triggered`/`deleted`. Scheduler executa scraping do produto no intervalo configurado.
- **Notificação:** Quando preço atual ≤ preço-meta, marca como `triggered` e envia para o canal.
- **Canais:** Console (log), Discord (webhook), SSE (tempo real no frontend).
- **Endpoints:** CRUD completo em `/api/watch/*`.
**Valor:** Alto | **Complexidade:** Alta

### 2.4 Histórico de preços por produto ✅
Implementado. O servidor salva cada preço encontrado em `price_history`, expõe `/api/history` e `/api/history/summary`, e o frontend mostra gráfico + KPIs dentro do `ProductCard`.
**Valor:** Alto | **Complexidade:** Média-Alta

### 2.5 Scraping periódico automático (cron) ✅
Implementado no `server.ts` com scheduler a cada 6h, até 10 produtos configuráveis, execução sequencial, botão "Executar agora", status e persistência em SQLite.
**Valor:** Alto | **Complexidade:** Média

### 2.6 Preço parcelado como gatilho no Watch ⬜
Watch hoje compara `preco_alvo_cents` com `preco_cents` (preço à vista). Adicionar opção de alertar com base no **preço parcelado** (`preco_parcelado_cents`) ou em qualquer forma de pagamento disponível. Ex: usuário quer ser notificado se o produto parcelado em 12x ficar abaixo de R$ 200/mês.
**Valor:** Médio | **Complexidade:** Baixa

---

## 3. Melhorias no Scraping (Fontes e Robustez)

### 3.1 Novos sites (Magalu, Amazon, Mercado Livre, Shopee) ⬜
Cada nova loja aumenta a utilidade do scraper. Amazon e ML são notoriamente difíceis (anti-bot agressivo).
**Valor:** Alto | **Complexidade:** Média-Alta

### 3.2 Suporte a paginação (mais resultados) ⬜
Atualmente pega apenas a primeira página. Adicionar navegação para coletar significativamente mais produtos.
**Valor:** Alto | **Complexidade:** Média

### 3.3 Cache inteligente com stale-while-revalidate 🟡
Existe cache local JSON com SHA256 e TTL de 10 minutos. Ainda falta o comportamento stale-while-revalidate com atualização em background.
**Valor:** Médio | **Complexidade:** Média

### 3.4 Estratégias de anti-bot mais robustas
O scraper já combina stealth plugin, pool de fingerprints por contexto e comportamento humano simulado. Para enfrentar Cloudflare avançado, Amazon e Mercado Livre, ainda pode evoluir com proxies, retries mais inteligentes e resolução externa de challenges. Abaixo em fases progressivas.

#### 3.4.1 Fase 1 — Plug-and-play stealth (baixo esforço) ✅
Implementado com `playwright-extra` + `puppeteer-extra-plugin-stealth`.

- **Integração:** substituir `chromium.launch()` por `playwright-extra` com o stealth plugin
- **Cobertura:** resolve bloqueios de sites com proteção média (Pichau, KaBuM! mais agressivo, TerabyteShop)
- **Manutenção:** quase zero — o plugin é mantido pela comunidade
- **Stack:** `playwright-extra` + `playwright-stealth` (npm)
- **Esforço:** 1 dia
- **Valor:** Alto | **Complexidade:** Baixa

#### 3.4.2 Fase 2 — Pool de fingerprints + comportamento humano (médio esforço) ✅
Implementado em `scraper.ts`: geração de fingerprint único por `browser.newContext()`, rotação por site para evitar repetir a mesma assinatura em buscas consecutivas, user-agent real/recente de Chrome desktop, viewport variável, spoof de navegador e comportamento humano simulado após navegação.

**Fingerprint realístico por contexto:**
- Para cada `browser.newContext()`, gera combinação única de: viewport (1920±200 × 1080±100), `userAgent` rotativo, `navigator.plugins`, `navigator.mimeTypes`, `navigator.hardwareConcurrency` (4-16), `navigator.deviceMemory` (4-8), `navigator.language`, `navigator.languages`, `navigator.platform`, timezone `America/Sao_Paulo` e WebGL vendor/renderer.
- Mantém memória da última assinatura por site e evita repetir a mesma combinação em requisições consecutivas.
- Pool atual usa UAs desktop Chrome 148/149 para Windows, Linux e macOS, além de perfis WebGL Intel, NVIDIA, AMD, Apple e Mesa.

**Comportamento humano simulado:**
- Scroll fixo foi substituído por scroll gradual via `page.mouse.wheel()` com pausas aleatórias (3-5 passos de 200-400px).
- Movimento de mouse usa coordenadas intermediárias, easing, jitter e pausas curtas entre passos.
- Esperas usam `randomWait()` com valores aleatórios em vez de constantes fixas.
- Rotina `comportamentoHumano()` roda após navegação em páginas DOM e na home de sites API quando necessário.
- Pausas entre digitação ficam como melhoria futura caso sejam adicionados fluxos com formulários.

**Stack:** nenhuma dependência extra — tudo via Playwright API pura (`context.addInitScript()`, `page.mouse`, `page.keyboard`)
**Esforço:** concluído
**Valor:** Alto | **Complexidade:** Média

#### 3.4.3 Fase 3 — Proxies rotativos + bypass Cloudflare (futuro)
*Reservado para implementação futura quando necessário.* Incluirá pool de proxies (BrightData/Webshare), retry com proxy diferente a cada falha, integração com 2Captcha/Capsolver para resolver challenges de Amazon e Mercado Livre.
**Valor:** Alto | **Complexidade:** Alta

### 3.5 Parsing avançado de parcelamento (CET, juros) ✅
Extrair dados mais ricos: com/sem juros, valor total a prazo, taxa de juros efetiva.
**Valor:** Médio | **Complexidade:** Baixa

### 3.6 Retry com backoff exponencial ✅
Implementado em `scraper-core/retry.ts`: `executarComRetry()` com classificação de erro (transient, challenge, fatal), backoff exponencial com jitter de ±35% e limite de tentativas por categoria.
**Valor:** Alto | **Complexidade:** Baixa

### 3.7 Auto-fix de selector quebrado ⬜
Quando uma loja muda o DOM e o scraping falha repetidamente, o sistema tenta detectar automaticamente o novo seletor analisando o HTML e comparando com padrões de produto conhecidos (título em `<h1>`/`<h2>`, preço com padrão `R$` + número, imagem em `<img>`). Fallback: salvar diff do HTML e sugerir seletor para revisão manual.
**Valor:** Alto | **Complexidade:** Alta

---

## 4. APIs e Infraestrutura do Servidor

### 4.1 Endpoint de busca multi-site ⬜
`/api/search/all?q=...` busca em todos os sites simultaneamente e agrega os resultados.
Criar categorias por exemplo: Busque em sites de informática(seria kabum, terabyte e Pichau por exemplo), Busque em marketplaces(seria mercado livre e shopee)
**Valor:** Alto | **Complexidade:** Média

### 4.2 Pool de browsers reutilizáveis (limite de concorrência) ⬜
Hoje cada execução concorrente abre seu próprio Chromium. Um pool com 1-2 browsers reciclados entre execuções reduz uso de RAM em VPS e elimina overhead de launch (~2-5s). Implementar com fila de tarefas e timeout de idle.
**Valor:** Alto | **Complexidade:** Média-Alta

### 4.3 Rate limiting no servidor ⬜
Prevenir abuso (ex.: 100 requisições/min). Protege o servidor e evita bloqueio pelos sites alvo.
**Valor:** Médio | **Complexidade:** Baixa

### 4.4 Endpoint de sugestão / autocomplete ✅
Sugerir termos de busca populares enquanto o usuário digita (baseado em histórico).
**Valor:** Médio | **Complexidade:** Baixa

### 4.5 Health check / status endpoint ⬜
`/api/health` para monitoramento (uptime, versão, status dos sites, uso de memória).
**Valor:** Médio | **Complexidade:** Baixa

### 4.6 Suporte a streaming (SSE ou WebSocket) ⬜
Notificar o frontend em tempo real quando uma busca concluir ou preço monitorado mudar.
**Valor:** Médio | **Complexidade:** Média

### 4.7 Logging estruturado ⬜
Substituir `console.log` por logger com níveis, timestamps e rotação de arquivos (pino, winston).
**Valor:** Médio | **Complexidade:** Baixa

---

## 5. Melhorias na Interface (UX/UI)

### 5.1 Filtros no frontend (preço, parcelamento, ordenação, produtos que tiveram alteração) ⬜
Filtrar/ordenar resultados sem refazer requisição: menor preço, maior relevância, faixa de valor.
**Valor:** Alto | **Complexidade:** Média

### 5.1b Centralizar configuração visual dos sites ⬜
`SITE_COLORS`, `SITE_NAMES` e badges de loja estão duplicados em ~5 componentes (`App.tsx`, `ProductCard.tsx`, `SearchForm.tsx`, `WatchPanel.tsx`, `WishlistPanel.tsx`). Criar um `sites.config.ts` no frontend (ou consumir via `/api/sites`) para evitar inconsistência ao adicionar nova loja.
**Valor:** Médio | **Complexidade:** Baixa

### 5.2 Comparação lado a lado de produtos ⬜
Selecionar 2-3 produtos e ver tabela comparativa com preços e lojas.
**Valor:** Médio | **Complexidade:** Média-Alta

### 5.3 Modo claro / temas ⬜
Atualmente só tema escuro. Permitir trocar para tema claro ou temas customizados.
**Valor:** Médio | **Complexidade:** Baixa

### 5.4 Melhorias de acessibilidade (a11y) ⬜
ARIA labels, foco gerenciado, contraste, navegação por teclado.
**Valor:** Médio | **Complexidade:** Média

### 5.5 Scroll infinito ⬜
Carregar mais produtos conforme o usuário rola (IntersectionObserver).
**Valor:** Médio | **Complexidade:** Média

### 5.6 PWA (instalável como app) ⬜
Service worker + manifest para instalar como aplicativo no celular/desktop.
**Valor:** Médio | **Complexidade:** Média

### 5.7 Paginação dos resultados no frontend ⬜
Dividir muitos resultados em páginas de 12 ou 20 itens.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.8 Lightbox / prévia ampliada da imagem ⬜
Mostrar versão ampliada ao passar o mouse ou clicar na imagem.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.9 Compartilhar resultado da busca ⬜
Botão para copiar link da busca ou compartilhar.
**Valor:** Baixo | **Complexidade:** Baixa

---

## 6. Comparação e Multi-Site

### 6.1 Busca integrada em todos os sites simultaneamente ⬜
Usuário busca em todas as lojas de uma vez e vê resultados agregados com melhor preço global em destaque.
**Valor:** Alto | **Complexidade:** Média

### 6.2 Aba "Melhor Preço Geral" (cross-site) ⬜
Destaque visual para o produto com menor preço entre todas as lojas para aquele termo.
**Valor:** Alto | **Complexidade:** Baixa

### 6.3 Cálculo de frete (via CEP) ⬜
Usuário insere o CEP e o scraper tenta extrair opções de frete de cada loja.
**Valor:** Médio | **Complexidade:** Alta

### 6.4 Cálculo de cashback / descontos ⬜
Exibir estimativas de cashback ou descontos para Pix/boleto.
**Valor:** Médio | **Complexidade:** Média

---

## 7. Notificações e Automação

### 7.1 Automação com GitHub Actions ⬜
Agendar scraping periódico via GitHub Actions (ex.: buscar "ryzen 5 5600" toda manhã).
**Valor:** Médio | **Complexidade:** Baixa

### 7.2 Webhook Discord / Telegram 🟡
Webhook Discord implementado. Enviar resultado de busca ou alerta de preço para um canal.
**Valor:** Médio | **Complexidade:** Média

### 7.3 Adicionar link do Scraper na mensagem do bot do Discord ⬜
Incluir no embed da mensagem do Discord um link direto para o Scraper (URL do servidor) para que o usuário possa clicar e abrir a interface.
**Valor:** Baixo | **Complexidade:** Baixa

### 7.4 CLI interativa (prompt) ⬜
Menu interativo com `readline` ou `inquirer` para escolher site e termo.
**Valor:** Baixo | **Complexidade:** Baixa

### 7.5 Notificação push via Web Push API ⬜
Hoje as notificações dependem de Discord (webhook externo) ou SSE (frontend aberto). Adicionar Web Push API (Service Worker + PushManager) para notificar o usuário mesmo com o browser fechado. Útil para alertas de Watch e Wishlist. Requer registro de SW e chave VAPID.
**Valor:** Alto | **Complexidade:** Média

### 7.6 Feed RSS / JSON de ofertas ⬜
Gerar feed público (RSS ou JSON Feed) com os melhores descontos detectados em todas as lojas. Usuário pode assinar no leitor de RSS ou conectar em automações como IFTTT/Zapier sem depender do frontend.
**Valor:** Médio | **Complexidade:** Baixa

---

## 8. DevOps, Testes e Qualidade

### 8.1 Testes E2E com Playwright (frontend) ⬜
Fluxo completo: abrir app, digitar termo, ver resultados, clicar em histórico.
**Valor:** Alto | **Complexidade:** Média

### 8.2 CI/CD (GitHub Actions) ⬜
Rodar `typecheck` + lint + testes automaticamente em cada push/PR.
**Valor:** Alto | **Complexidade:** Baixa

### 8.3 Dockerfile e docker-compose ⬜
`docker compose up` sobe servidor + dependências.
**Valor:** Médio | **Complexidade:** Baixa-Média

### 8.4 Bundle do servidor com esbuild ⬜
Build mais rápido e limpo que `tsc`.
**Valor:** Baixo | **Complexidade:** Baixa

### 8.5 Testes unitários (Vitest) ✅
Implementado: `tests/scraper.test.ts` (parsing DOM, extração de preços, ordenação), `tests/retry.test.ts` (backoff lógico), `tests/search-runtime.test.ts` (runtime com mocks), `client/src/hooks/hooks.test.tsx` (hooks React).
**Valor:** Alto | **Complexidade:** Baixa-Média

### 8.6 Testes de integração (API endpoints) ✅
Implementado em `tests/server.test.ts`: testa helpers do servidor, rotas `/api/search`, `/api/auto/*`, `/api/watch/*`, regras do scheduler, com scraper mockado e SQLite temporário.
**Valor:** Alto | **Complexidade:** Média

---

## 9. Analytics e Dados

### 9.1 Dashboard de estatísticas ✅
Implementado: KPIs (total de buscas, taxa de sucesso, tempo médio, sites mais acessíveis) via tabela `search_metrics`, com ranking de performance por site e ordenação configurável.
**Valor:** Médio | **Complexidade:** Média

### 9.2 Termos de busca populares (anonymized) ⬜
Agregar termos para mostrar "produtos mais buscados".
**Valor:** Médio | **Complexidade:** Baixa-Média

### 9.3 Tracking de falhas por site ⬜
Monitorar quais sites estão com desafio/bloqueio e quais erros são mais comuns.
**Valor:** Médio | **Complexidade:** Baixa

---

## 10. Segurança e Confiabilidade

### 10.1 Sanitização de URLs (path traversal) ⬜
Garantir que `../etc/passwd` não funcione no servir de arquivos estáticos.
**Valor:** Alto | **Complexidade:** Baixa

### 10.2 Sanitização de inputs (XSS) ✅
O servidor já usa `escapeHtml()` em respostas HTML de erro para arquivos estáticos, e a UI React escapa texto por padrão. Revisão completa feita em jun/2026:
- `escapeHtml()` agora escapa `&`, `<`, `>`, `"`, `'` e backtick — cobertura total para contextos text e atributo.
- Nenhum HTML legado encontrado: apenas `client/index.html` (template estático React).
- Nenhuma rota da API retorna HTML — todas usam `sendJson()`.
- Nenhum `dangerouslySetInnerHTML` no frontend.
- Links externos usam `rel="noopener noreferrer"`.
- Todos os `writeHead` de HTML incluem `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e CSP com `default-src 'self'`.
**Valor:** Alto | **Complexidade:** Baixa

### 10.3 Timeout global e cancelamento de requests 🟡
Há timeouts por operação do Playwright (`TIMEOUT = 30000` e esperas específicas), mas ainda falta cancelamento global por request com `AbortController`.
**Valor:** Alto | **Complexidade:** Baixa

---

## 11. Inovação e Features Disruptivas

### 11.1 Predição de preço com ML leve ⬜
Usar o histórico acumulado em `price_history` para treinar um modelo simples de regressão (polinomial ou Prophet) no próprio servidor Node.js. Exibir no gráfico do card: "preço estimado em 7/14/30 dias" com linha pontilhada e intervalo de confiança. Stack: `tensorflow.js` ou regressão polinomial pura sem dependências externas.

**Diferencial:** Nenhum outro scraper brasileiro oferece predição de preço.
**Valor:** Alto | **Complexidade:** Alta

### 11.2 Alerta inteligente "Esperar ou Comprar?" ⬜
Com base no histórico, sazonalidade (Black Friday, Dia do Consumidor) e tendência atual, o sistema recomenda textualmente: *"Compre agora — preço 15% abaixo da média de 30 dias"* ou *"Espere — tendência é cair 8% nos próximos 15 dias"*. Exibido no card do produto e no embed do Discord.

**Diferencial:** Transforma dado bruto em decisão de compra. Mata a indecisão do usuário.
**Valor:** Alto | **Complexidade:** Média-Alta

### 11.3 Modo "Garimpo" — descoberta de ofertas ⬜
Scraper varre categorias inteiras (ex: "hardware", "monitor", "mouse", "fonte") sem um termo de busca específico e retorna produtos com maior desconto percentual vs. média histórica. O usuário não precisa saber o que quer — o sistema encontra as melhores oportunidades.

**Fluxo:** Botão "Garimpar" → scraper navega por departamentos → cruza preço atual com histórico → exibe "Ofertas quentes" ranqueadas por desconto.
**Diferencial:** Útil para o usuário que "só quer saber se tem algo bom".
**Valor:** Alto | **Complexidade:** Média-Alta

### 11.4 Lista de compras (carrinho multi-produto) ⬜
Usuário monta uma cesta com N produtos de lojas diferentes e o sistema calcula o preço total, melhor combinação de fretes (por CEP) e exibe o custo total mais barato. Ideal para montar um PC completo e saber onde comprar cada peça.

**Fluxo:** Adicionar produtos de diferentes buscas a uma "cesta" → informar CEP → sistema tenta extrair frete de cada loja → exibe total + sugestão de otimização.
**Valor:** Médio | **Complexidade:** Alta

### 11.5 Extensão de browser (Chrome/Firefox) ⬜
Extensão que, ao navegar por um produto em loja suportada, automaticamente sobrepõe um popup com: histórico de preço do produto, comparação com outras lojas, alerta "está caro/barato vs. média" e link para abrir no Scraper. Comunicação com o servidor local via REST ou WebSocket.

**Diferencial:** Leva o scraper para onde o usuário já está navegando. Zero atrito.
**Valor:** Alto | **Complexidade:** Alta

### 11.6 Múltiplos usuários (auth básica) ⬜
Cada usuário com seus próprios alerts, watch e wishlist. Login via token simples ou senha única (sem OAuth complexo). Útil para rodar o scraper em família, grupo de amigos ou república. Dados isolados por `user_id` no SQLite.

**Valor:** Médio | **Complexidade:** Média

### 11.7 Modo "Drift" — monitoramento intensivo ⬜
Refinamento do Watch atual: em vez de polling a cada 3h, o usuário ativa o modo "Drift" para um alerta específico. O scheduler então faz verificações a cada 1-2 minutos por até 30 minutos, usando um browser persistente (sem launch por ciclo). Ideal para promoções-relâmpago e lançamentos de GPU onde o preço muda em minutos. Desliga automaticamente quando o preço estabiliza ou o tempo expira.

**Diferença do 2.1:** O item 2.1 propõe browser persistente como conceito geral; este item propõe um **modo de curta duração com auto-desligamento** e UX específica no frontend (timer, status "Drift ativo").
**Valor:** Alto | **Complexidade:** Alta

---

## 🗺️ Roadmap Sugerido

**Legenda:** ✅ Concluído · 🟡 Parcial · ⬜ Pendente

---

### 🔥 Foco Imediato (Alto Impacto)

| # | Feature | Esforço | Impacto | Status |
|:---:|---|:---:|:---:|:---:|
| 1 | Busca multi-site simultânea | Médio | 🔥 Alto | ⬜ |
| 2 | Pool de browsers reutilizáveis | Médio–Alto | 🔥 Alto | ⬜ |
| 3 | Browser persistente — Live Price / Drift | Alta | 🔥 Alto | ⬜ |
| 4 | Filtros no frontend (preço, ordenação) | Médio | 🔥 Alto | ⬜ |
| 8 | Predição de preço com ML | Alta | 🔥 Alto | ⬜ |
| 9 | Alerta inteligente "Esperar ou Comprar?" | Médio–Alta | 🔥 Alto | ⬜ |
| 10 | Modo "Garimpo" (ofertas sem termo) | Médio–Alta | 🔥 Alto | ⬜ |
| 11 | Extensão de browser | Alta | 🔥 Alto | ⬜ |
| 12 | Notificação push (Web Push API) | Médio | 🔥 Alto | ⬜ |
| 16 | Migrações SQLite formais | Baixo–Média | 🔥 Alto | ⬜ |
| 21 | Auto-fix de selector quebrado | Alta | 🔥 Alto | ⬜ |

### ⚡ Médio Impacto

| # | Feature | Esforço | Impacto | Status |
|:---:|---|:---:|:---:|:---:|
| 13 | CI/CD básico (typecheck + test) | Baixo | ⚡ Médio | ⬜ |
| 14 | Export CSV/JSON | Baixo | ⚡ Médio | ⬜ |
| 15 | Mais sites (Magalu, Amazon, ML) | Médio–Alto | ⚡ Médio | ⬜ |
| 17 | Rate limiting | Baixo | ⚡ Médio | ⬜ |
| 18 | Stale-while-revalidate no cache | Médio | ⚡ Médio | ⬜ |
| 19 | PWA (instalável) | Médio | ⚡ Médio | ⬜ |
| 20 | Centralizar config visual dos sites | Baixo | ⚡ Médio | ⬜ |
| 22 | Múltiplos usuários | Médio | ⚡ Médio | ⬜ |
| 23 | Lista de compras / carrinho multi-produto | Alta | ⚡ Médio | ⬜ |
| 24 | Feed RSS / JSON de ofertas | Baixa | ⚡ Médio | ⬜ |

### ✅ Já Concluído

| # | Feature | Esforço | Impacto | Status |
|:---:|---|:---:|:---:|:---:|
| 5 | Watch de preços com alertas | Alto | 🔥 Alto | ✅ |
| 6 | Retry com backoff + timeout global | Baixo | 🔥 Alto | 🟡 |
| 7 | Testes unitários e integração (Vitest) | Baixo–Médio | 🔥 Alto | ✅ |

---

### 📋 Checklist Detalhado — Concluído

- ✅ **Interface React** — busca manual por loja, histórico local, cards de produto, destaque de melhor opção, estados de carregamento/erro/vazio.
- ✅ **Scraper multi-loja** — KaBuM!, Pichau e TerabyteShop com DOM scraping (KaBuM!/Pichau) e API scraping (TerabyteShop).
- ✅ **Ordenação** — por relevância e preço com extração de título, preço, parcelamento, imagem e URL.
- ✅ **Cache local** — `data/cache/` com chave SHA256 e TTL de 10 minutos.
- ✅ **SQLite** — `better-sqlite3` em `data/scraper.db` com tabelas de auto-busca e histórico de preços.
- ✅ **Aba "Automática"** — configurar até 10 produtos, status, execução manual e resultados.
- ✅ **Scheduler server-side** — a cada 6h, execução sequencial, recuperação de crash, persistência.
- ✅ **Histórico de preços** — gráfico + KPIs (mínimo, máximo, média, tendência) no card.
- ✅ **Endpoints** — `/api/auto/*` e `/api/history*` no servidor HTTP puro.
- ✅ **Anti-detecção** — `playwright-extra`, stealth, fingerprint realístico, spoof e comportamento humano.
- ✅ **Watch de preços** — CRUD, scheduler, notificações Discord/SSE/Console.
- ✅ **Retry** — backoff exponencial com jitter para erros transientes e challenge.
- ✅ **Testes (Vitest)** — parsing, retry, helpers, search runtime com mocks, hooks React.
- ✅ **Wishlist** — CRUD, scheduler, notificação Discord, soft delete, gráfico de histórico.
- ✅ **Dashboard** — KPIs de busca, breakdown por site, ordenação por performance.
- ✅ **Autocomplete** — `/api/search/suggest` com base no histórico de buscas.
- ✅ **Sanitização XSS** — `escapeHtml()` total, CSP headers, sem `dangerouslySetInnerHTML`.
